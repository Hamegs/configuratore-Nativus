import { create } from 'zustand';
import type { ProjectRoom, ProjectCartRow, AggregatedRawQty, PackagingStrategy, ConfigLogEntry, StepLavorazione } from '../types/project';
import type { CartLine } from '../types/cart';
import type { WizardState } from '../types/wizard-state';
import type { CartResult } from '../engine/cart-calculator';
import type { StepDefinition } from '../types/step';
import { computePackagingOptions, bestOption } from '../engine/packaging-optimizer';
import type { DataStore } from '../utils/data-loader';
import { getCommercialName } from '../utils/product-names';
import type { PackagedItem } from '../types/services';
import { useCartStore } from './cart-store';
import { computeTechnicalGroups, type TechnicalGroupEnriched } from '../services/technical';
import { computePackagedItems } from '../services/packaging';

const LS_KEY = 'nativus_project';

interface ProjectState {
  rooms: ProjectRoom[];
  cart: ProjectCartRow[];
  strategy: PackagingStrategy;
  cart_built: boolean;
  config_log: ConfigLogEntry[];
}

interface ProjectStore extends ProjectState {
  addRoom: (room_type: string, custom_name: string) => string;
  removeRoom: (id: string) => void;
  setRoomResult: (id: string, state: WizardState, lines: CartLine[], store: DataStore, result?: CartResult) => void;
  unconfigureRoom: (id: string) => void;
  buildCart: (store: DataStore, strategy?: PackagingStrategy) => void;
  setStrategy: (s: PackagingStrategy, store: DataStore) => void;
  overrideCartRow: (row_id: string, sku_id: string, qty_packs: number, store: DataStore) => void;
  excludeCartRow: (row_id: string) => void;
  restoreCartRow: (row_id: string) => void;
  removeCartRow: (row_id: string) => void;
  addManualRow: (sku_id: string, qty_packs: number, store: DataStore) => void;
  reset: () => void;
  persist: () => void;
  hydrate: () => void;
  isManualMode: () => boolean;
}

function buildStepLavorazioni(roomId: string, result: CartResult): StepLavorazione[] {
  const lav: StepLavorazione[] = [];
  let order = 0;

  function addSteps(steps: StepDefinition[], sectionPrefix: string) {
    for (const s of steps) {
      order += 10;
      const alerts = s.hard_alerts?.join('; ') ?? '';
      lav.push({
        id: crypto.randomUUID(),
        id_ambiente: roomId,
        numero_step: s.step_order ?? order,
        descrizione_step: s.name,
        prodotti_coinvolti: s.product_id ?? '',
        consumi_step: s.qty_total != null && s.unit ? `${s.qty_total.toFixed(2)} ${s.unit}` : '',
        note_tecniche: [sectionPrefix, alerts].filter(Boolean).join(' — '),
      });
    }
  }

  if (result.procedure_floor) addSteps(result.procedure_floor.steps, 'Pavimento');
  if (result.procedure_wall) addSteps(result.procedure_wall.steps, 'Pareti');

  for (const s of result.procedure_texture) {
    order += 10;
    lav.push({
      id: crypto.randomUUID(),
      id_ambiente: roomId,
      numero_step: s.step_order,
      descrizione_step: s.name,
      prodotti_coinvolti: s.product_id ?? '',
      consumi_step: s.qty_total_kg != null && s.unit ? `${s.qty_total_kg.toFixed(2)} ${s.unit}` : '',
      note_tecniche: ['Texture', s.note ?? '', ...s.hard_alerts].filter(Boolean).join(' — '),
    });
  }

  for (const s of result.procedure_protettivi) {
    order += 10;
    lav.push({
      id: crypto.randomUUID(),
      id_ambiente: roomId,
      numero_step: s.step_order,
      descrizione_step: s.name,
      prodotti_coinvolti: s.product_id ?? '',
      consumi_step: s.qty_total_kg != null && s.unit ? `${s.qty_total_kg.toFixed(2)} ${s.unit}` : '',
      note_tecniche: ['Protettivi', s.diluizione ?? '', s.note ?? '', ...s.hard_alerts].filter(Boolean).join(' — '),
    });
  }

  return lav;
}

function aggregate(rooms: ProjectRoom[]): AggregatedRawQty[] {
  const map = new Map<string, AggregatedRawQty>();
  for (const room of rooms) {
    if (!room.is_configured) continue;
    for (const line of room.cart_lines) {
      // Texture: aggregate by descrizione (includes texture+color+zone)
      // Other: aggregate by product_id to merge same product across rooms
      const key = line.section === 'texture'
        ? `${line.descrizione}|${line.pack_size ?? ''}`
        : (line.product_id ?? line.sku_id);
      const rawBase = line.qty_raw ?? line.qty * (line.pack_size ?? 1);
      const roomName = room.custom_name || room.room_type;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.qty_raw += rawBase;
        if (!existing.from_rooms.includes(roomName)) {
          existing.from_rooms.push(roomName);
        }
      } else {
        map.set(key, {
          product_id: line.product_id ?? line.sku_id,
          sku_id_default: line.sku_id,
          descrizione: line.descrizione,
          qty_raw: rawBase,
          pack_size_default: line.pack_size ?? 1,
          pack_unit: line.pack_unit ?? 'kg',
          section: line.section,
          from_rooms: [roomName],
        });
      }
    }
  }
  return Array.from(map.values());
}

type GroupWithRooms = TechnicalGroupEnriched & { _from_rooms: string[] };

function buildCartFromRooms(
  rooms: ProjectRoom[],
  store: DataStore,
  strategy: PackagingStrategy,
): ProjectCartRow[] {
  const configured = rooms.filter(r => r.is_configured && r.wizard_state);
  if (configured.length === 0) return [];

  const texById = new Map<string, GroupWithRooms>();
  const nonTexById = new Map<string, { product_id: string; section: CartLine['section']; qty_raw: number; from_rooms: string[]; nomeCommerciale: string }>();

  for (const room of configured) {
    const roomName = room.custom_name || room.room_type;
    let groups: TechnicalGroupEnriched[];
    try {
      groups = computeTechnicalGroups(room.wizard_state!, store);
    } catch {
      continue;
    }
    for (const g of groups) {
      if (g.section === 'texture') {
        const existing = texById.get(g.id);
        if (existing) {
          existing.qty_raw += g.qty_raw;
          if (!existing._from_rooms.includes(roomName)) existing._from_rooms.push(roomName);
        } else {
          texById.set(g.id, { ...g, _from_rooms: [roomName] });
        }
      } else {
        const key = `${g.product_id}::${g.section}::${g.destination ?? ''}`;
        const existing = nonTexById.get(key);
        if (existing) {
          existing.qty_raw += g.qty_raw;
          if (!existing.from_rooms.includes(roomName)) existing.from_rooms.push(roomName);
        } else {
          nonTexById.set(key, {
            product_id: g.product_id,
            section: g.section as CartLine['section'],
            qty_raw: g.qty_raw,
            from_rooms: [roomName],
            nomeCommerciale: g.nomeCommerciale,
          });
        }
      }
    }
  }

  const texGroups = Array.from(texById.values());
  const fromRoomsMap = new Map<string, string[]>();
  for (const g of texGroups) {
    fromRoomsMap.set(`${g.product_id}::${g.destination ?? ''}`, g._from_rooms);
  }
  const texItems = computePackagedItems(texGroups, store, strategy);
  const texRows: ProjectCartRow[] = texItems.map(item => ({
    row_id: item.row_id,
    product_id: item.product_id ?? null,
    sku_id: item.sku_id,
    descrizione: item.description,
    qty_packs: item.qty_packs,
    pack_size: item.pack_size,
    pack_unit: item.pack_unit,
    prezzo_unitario: item.prezzo_unitario,
    totale: item.totale,
    source: 'auto' as const,
    status: 'active' as const,
    is_override: false,
    section: item.section as CartLine['section'],
    from_rooms: fromRoomsMap.get(`${item.product_id}::${item.destination ?? ''}`) ?? [],
  }));

  const nonTexRows: ProjectCartRow[] = [];
  for (const [, agg] of nonTexById) {
    const skus = store.packagingSku.filter(s => s.product_id === agg.product_id);
    if (skus.length === 0) continue;
    const opts = computePackagingOptions(agg.qty_raw, skus, store.listino);
    const best = bestOption(opts, strategy);
    if (!best) continue;
    nonTexRows.push({
      row_id: crypto.randomUUID(),
      product_id: agg.product_id ?? null,
      sku_id: best.sku_id,
      descrizione: agg.nomeCommerciale,
      qty_packs: best.qty_packs,
      pack_size: best.pack_size,
      pack_unit: best.pack_unit,
      prezzo_unitario: best.prezzo_unitario,
      totale: best.totale,
      source: 'auto' as const,
      status: 'active' as const,
      is_override: false,
      section: agg.section,
      from_rooms: agg.from_rooms,
    });
  }

  return [...nonTexRows, ...texRows];
}

function makeLogEntry(
  partial: Omit<ConfigLogEntry, 'id' | 'timestamp'>
): ConfigLogEntry {
  return {
    ...partial,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

const initialState: ProjectState = {
  rooms: [],
  cart: [],
  strategy: 'MINIMO_SFRIDO',
  cart_built: false,
  config_log: [],
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...initialState,

  isManualMode: () => get().strategy === 'MANUALE',

  addRoom: (room_type, custom_name) => {
    const id = crypto.randomUUID();
    set(s => ({
      rooms: [...s.rooms, {
        id, room_type, custom_name,
        is_configured: false,
        wizard_state: null,
        cart_lines: [],
        cart_result: null,
        step_lavorazioni: [],
        computation_errors: [],
      }],
    }));
    get().persist();
    return id;
  },

  removeRoom: (id) => {
    set(s => ({ rooms: s.rooms.filter(r => r.id !== id), cart_built: false }));
    get().persist();
  },

  setRoomResult: (id, wizard_state, lines, store, result?) => {
    const step_lavorazioni = result ? buildStepLavorazioni(id, result) : [];
    const computation_errors = result ? result.computation_errors : [];
    set(s => ({
      rooms: s.rooms.map(r =>
        r.id === id
          ? { ...r, wizard_state, cart_lines: lines, cart_result: result ?? null, is_configured: true, step_lavorazioni, computation_errors }
          : r
      ),
    }));
    // Auto-rebuild cart immediately (full reset)
    const currentStrategy = get().strategy;
    const rows = buildCartFromRooms(get().rooms, store, currentStrategy);
    set({ cart: rows, cart_built: true });
    // Sync cart-store with the newly built aggregated cart
    const packaged: PackagedItem[] = rows.map(row => ({
      row_id: row.row_id,
      product_id: row.product_id ?? row.sku_id,
      sku_id: row.sku_id,
      nomeCommerciale: getCommercialName(row.product_id ?? undefined) ?? row.descrizione,
      description: row.descrizione,
      destination: null,
      section: row.section,
      qty_packs: row.qty_packs,
      pack_size: row.pack_size,
      pack_unit: row.pack_unit,
      prezzo_unitario: row.prezzo_unitario,
      totale: row.totale,
      from_rooms: row.from_rooms,
      status: row.status,
      source: row.source,
    }));
    useCartStore.getState().setItems(packaged);
    get().persist();
  },

  unconfigureRoom: (id) => {
    set(s => ({
      rooms: s.rooms.map(r =>
        r.id === id
          ? { ...r, wizard_state: null, cart_lines: [], cart_result: null, is_configured: false, step_lavorazioni: [], computation_errors: [] }
          : r
      ),
      cart_built: false,
    }));
    get().persist();
  },

  buildCart: (store, strategy?) => {
    const s = strategy ?? get().strategy;
    const rows = buildCartFromRooms(get().rooms, store, s);
    set({ cart: rows, strategy: s, cart_built: true });
    get().persist();
  },

  setStrategy: (strategy, store) => {
    if (strategy === 'MANUALE') {
      set({ strategy });
      get().persist();
      return;
    }
    const autoRows = buildCartFromRooms(get().rooms, store, strategy);
    const manual = get().cart.filter(r => r.source === 'manual');
    const merged = [...autoRows, ...manual];
    set({ strategy, cart: merged, cart_built: true });
    get().persist();
  },

  overrideCartRow: (row_id, sku_id, qty_packs, store) => {
    const prev = get().cart.find(r => r.row_id === row_id);
    set(s => ({
      cart: s.cart.map(r => {
        if (r.row_id !== row_id) return r;
        const skuInfo = store.packagingSku.find(p => p.sku_id === sku_id);
        const price = store.listino.find(l => l.sku_id === sku_id)?.prezzo_listino ?? 0;
        return {
          ...r,
          sku_id,
          qty_packs,
          pack_size: skuInfo?.pack_size ?? r.pack_size,
          pack_unit: skuInfo?.pack_unit ?? r.pack_unit,
          descrizione: getCommercialName(skuInfo?.product_id) ?? skuInfo?.descrizione_sku ?? r.descrizione,
          prezzo_unitario: price,
          totale: qty_packs * price,
          is_override: true,
          status: 'active' as const,
        };
      }),
    }));
    if (prev) {
      const room = get().rooms.find(r => r.cart_lines.some(l => l.sku_id === prev.sku_id)) ?? null;
      const entry = makeLogEntry({
        room_id: room?.id ?? null,
        room_name: room ? (room.custom_name || room.room_type) : null,
        sku_id: prev.sku_id,
        product_name: prev.descrizione,
        qty_before: prev.qty_packs,
        qty_after: qty_packs,
        mode_before: get().strategy,
        action: 'override',
      });
      set(s => ({ config_log: [entry, ...s.config_log] }));
    }
    get().persist();
  },

  excludeCartRow: (row_id) => {
    const prev = get().cart.find(r => r.row_id === row_id);
    set(s => ({ cart: s.cart.map(r => r.row_id === row_id ? { ...r, status: 'excluded' as const } : r) }));
    if (prev) {
      const entry = makeLogEntry({
        room_id: null, room_name: null,
        sku_id: prev.sku_id, product_name: prev.descrizione,
        qty_before: prev.qty_packs, qty_after: 0,
        mode_before: get().strategy, action: 'exclude',
      });
      set(s => ({ config_log: [entry, ...s.config_log] }));
    }
    get().persist();
  },

  restoreCartRow: (row_id) => {
    const prev = get().cart.find(r => r.row_id === row_id);
    set(s => ({ cart: s.cart.map(r => r.row_id === row_id ? { ...r, status: 'active' as const } : r) }));
    if (prev) {
      const entry = makeLogEntry({
        room_id: null, room_name: null,
        sku_id: prev.sku_id, product_name: prev.descrizione,
        qty_before: 0, qty_after: prev.qty_packs,
        mode_before: get().strategy, action: 'restore',
      });
      set(s => ({ config_log: [entry, ...s.config_log] }));
    }
    get().persist();
  },

  removeCartRow: (row_id) => {
    const prev = get().cart.find(r => r.row_id === row_id);
    set(s => ({ cart: s.cart.filter(r => r.row_id !== row_id) }));
    if (prev) {
      const entry = makeLogEntry({
        room_id: null, room_name: null,
        sku_id: prev.sku_id, product_name: prev.descrizione,
        qty_before: prev.qty_packs, qty_after: 0,
        mode_before: get().strategy, action: 'remove',
      });
      set(s => ({ config_log: [entry, ...s.config_log] }));
    }
    get().persist();
  },

  addManualRow: (sku_id, qty_packs, store) => {
    const skuInfo = store.packagingSku.find(p => p.sku_id === sku_id);
    const price = store.listino.find(l => l.sku_id === sku_id)?.prezzo_listino ?? 0;
    const row: ProjectCartRow = {
      row_id: crypto.randomUUID(),
      product_id: skuInfo?.product_id ?? null,
      sku_id,
      descrizione: getCommercialName(skuInfo?.product_id) ?? skuInfo?.descrizione_sku ?? sku_id,
      qty_packs,
      pack_size: skuInfo?.pack_size ?? 1,
      pack_unit: skuInfo?.pack_unit ?? 'pz',
      prezzo_unitario: price,
      totale: qty_packs * price,
      source: 'manual',
      status: 'active',
      is_override: false,
      section: 'speciale',
    };
    const prevStrategy = get().strategy;
    set(s => ({ cart: [...s.cart, row], strategy: 'MANUALE' }));
    const entry = makeLogEntry({
      room_id: null, room_name: null,
      sku_id, product_name: row.descrizione,
      qty_before: 0, qty_after: qty_packs,
      mode_before: prevStrategy, action: 'add_manual',
    });
    set(s => ({ config_log: [entry, ...s.config_log] }));
    get().persist();
  },

  reset: () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    set({ ...initialState });
  },

  persist: () => {
    try {
      const { rooms, cart, strategy, cart_built, config_log } = get();
      localStorage.setItem(LS_KEY, JSON.stringify({ rooms, cart, strategy, cart_built, config_log }));
    } catch { /* noop */ }
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProjectState> & { rooms: ProjectRoom[] };
        if (!parsed.config_log) parsed.config_log = [];
        // Migrate old rooms without step_lavorazioni/computation_errors
        parsed.rooms = parsed.rooms.map(r => ({
          ...r,
          step_lavorazioni: r.step_lavorazioni ?? [],
          computation_errors: r.computation_errors ?? [],
        }));
        set({ ...parsed as ProjectState, cart_built: false });
      }
    } catch { /* noop */ }
  },
}));
