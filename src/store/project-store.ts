import { create } from 'zustand';
import type { ProjectRoom, ProjectCartRow, AggregatedRawQty, PackagingStrategy, ConsolidationMode, ConfigLogEntry, StepLavorazione } from '../types/project';
import type { CartLine, RawCartLine } from '../types/cart';
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
import { consolidateRawByEnvironment, consolidateRawGlobal, packageLines } from '../engine/raw-cart-engine';

const LS_KEY = 'nativus_project';

interface ProjectState {
  rooms: ProjectRoom[];
  cart: ProjectCartRow[];
  strategy: PackagingStrategy;
  consolidation_mode: ConsolidationMode;
  cart_built: boolean;
  config_log: ConfigLogEntry[];
  cart_total_optimized: number;
  cart_total_separate: number;
  cart_savings_eur: number;
}

interface ProjectStore extends ProjectState {
  addRoom: (room_type: string, custom_name: string) => string;
  removeRoom: (id: string) => void;
  setRoomResult: (id: string, state: WizardState, lines: CartLine[], store: DataStore, result?: CartResult) => void;
  unconfigureRoom: (id: string) => void;
  buildCart: (store: DataStore, strategy?: PackagingStrategy) => void;
  setStrategy: (s: PackagingStrategy, store: DataStore) => void;
  setConsolidationMode: (mode: ConsolidationMode, store: DataStore) => void;
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

/**
 * SEPARATE mode — raw-first pipeline.
 * Per ogni ambiente: packageLines(room.raw_cart_lines, strategy).
 * Fallback a computeTechnicalGroups se raw_cart_lines non disponibili.
 */
function buildCartFromRoomsSeparate(
  rooms: ProjectRoom[],
  store: DataStore,
  strategy: PackagingStrategy,
): ProjectCartRow[] {
  const configured = rooms.filter(r => r.is_configured && r.wizard_state);
  if (configured.length === 0) return [];

  const allEnvRaw: RawCartLine[] = [];
  const fallbackRooms: typeof configured = [];

  for (const room of configured) {
    if ((room.raw_cart_lines ?? []).length > 0) {
      for (const raw of room.raw_cart_lines) {
        allEnvRaw.push({ ...raw, environment_id: room.id });
      }
    } else {
      fallbackRooms.push(room);
    }
  }

  console.log('[SEPARATE] RAW', allEnvRaw);
  const envConsolidated = consolidateRawByEnvironment(allEnvRaw);
  console.log('[SEPARATE] ENV CONSOLIDATED', envConsolidated);

  const allRows: ProjectCartRow[] = [];

  for (const room of configured) {
    const roomName = room.custom_name || room.room_type;

    if ((room.raw_cart_lines ?? []).length > 0) {
      const rawLines = envConsolidated.get(room.id) ?? [];
      const packaged = packageLines(store, rawLines, strategy);
      console.log('[SEPARATE] PACKAGED RESULT for', roomName, packaged);
      for (const line of packaged) {
        allRows.push({
          row_id: crypto.randomUUID(),
          product_id: line.product_id ?? null,
          sku_id: line.sku_id,
          descrizione: line.descrizione,
          qty_packs: line.qty,
          pack_size: line.pack_size ?? 0,
          pack_unit: line.pack_unit ?? 'kg',
          prezzo_unitario: line.prezzo_unitario,
          totale: line.totale,
          source: 'auto',
          status: 'active',
          is_override: false,
          section: line.section,
          from_rooms: [roomName],
        });
      }
    } else {
      // Legacy fallback
      let groups: TechnicalGroupEnriched[];
      try {
        groups = computeTechnicalGroups(room.wizard_state!, store);
      } catch { continue; }
      let items: ReturnType<typeof computePackagedItems>;
      try {
        items = computePackagedItems(groups, store, strategy);
      } catch { continue; }
      for (const item of items.filter(i => i.status === 'active')) {
        allRows.push({
          row_id: crypto.randomUUID(),
          product_id: item.product_id ?? null,
          sku_id: item.sku_id,
          descrizione: item.description,
          qty_packs: item.qty_packs,
          pack_size: item.pack_size,
          pack_unit: item.pack_unit,
          prezzo_unitario: item.prezzo_unitario,
          totale: item.totale,
          source: 'auto',
          status: 'active',
          is_override: false,
          section: item.section as ProjectCartRow['section'],
          from_rooms: [roomName],
        });
      }
    }
  }

  return allRows;
}

/**
 * OPTIMIZED (GLOBAL) mode — raw-first pipeline.
 * Aggrega qty_raw di tutti gli ambienti → packageLines una sola volta.
 * Fallback a computeTechnicalGroups se raw_cart_lines non disponibili.
 */
function buildCartFromRooms(
  rooms: ProjectRoom[],
  store: DataStore,
  strategy: PackagingStrategy,
): ProjectCartRow[] {
  const configured = rooms.filter(r => r.is_configured && r.wizard_state);
  if (configured.length === 0) return [];

  const allRaw: RawCartLine[] = [];
  const fromRoomsMap = new Map<string, string[]>();

  // Rooms with raw_cart_lines → raw-first pipeline
  const rawRooms = configured.filter(r => (r.raw_cart_lines ?? []).length > 0);
  const legacyRooms = configured.filter(r => (r.raw_cart_lines ?? []).length === 0);

  for (const room of rawRooms) {
    const roomName = room.custom_name || room.room_type;
    for (const raw of room.raw_cart_lines) {
      const key = raw.section === 'texture'
        ? `texture::${raw.product_id}::${raw.color_label ?? ''}`
        : `${raw.product_id}::${raw.section}::${raw.destination ?? ''}`;
      const existing = fromRoomsMap.get(key) ?? [];
      if (!existing.includes(roomName)) existing.push(roomName);
      fromRoomsMap.set(key, existing);
      allRaw.push({ ...raw, environment_id: room.id });
    }
  }

  console.log('[OPTIMIZED] RAW', allRaw);
  const globalConsolidated = consolidateRawGlobal(allRaw);
  console.log('[OPTIMIZED] GLOBAL CONSOLIDATED', globalConsolidated);

  const rawRows: ProjectCartRow[] = rawRooms.length > 0
    ? packageLines(store, globalConsolidated, strategy).map(line => {
        const key = line.section === 'texture'
          ? `texture::${line.product_id}::${(line as { color_label?: string }).color_label ?? ''}`
          : `${line.product_id}::${line.section}::${(line as { destination?: string }).destination ?? ''}`;
        return {
          row_id: crypto.randomUUID(),
          product_id: line.product_id ?? null,
          sku_id: line.sku_id,
          descrizione: line.descrizione,
          qty_packs: line.qty,
          pack_size: line.pack_size ?? 0,
          pack_unit: line.pack_unit ?? 'kg',
          prezzo_unitario: line.prezzo_unitario,
          totale: line.totale,
          source: 'auto' as const,
          status: 'active' as const,
          is_override: false,
          section: line.section,
          from_rooms: fromRoomsMap.get(key) ?? [],
        };
      })
    : [];
  console.log('[OPTIMIZED] PACKAGED RESULT', rawRows);

  // Legacy fallback for rooms without raw_cart_lines
  const legacyRows: ProjectCartRow[] = [];
  if (legacyRooms.length > 0) {
    const texById = new Map<string, GroupWithRooms>();
    const nonTexById = new Map<string, { product_id: string; section: CartLine['section']; qty_raw: number; from_rooms: string[]; nomeCommerciale: string }>();
    for (const room of legacyRooms) {
      const roomName = room.custom_name || room.room_type;
      let groups: TechnicalGroupEnriched[];
      try { groups = computeTechnicalGroups(room.wizard_state!, store); } catch { continue; }
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
            nonTexById.set(key, { product_id: g.product_id, section: g.section as CartLine['section'], qty_raw: g.qty_raw, from_rooms: [roomName], nomeCommerciale: g.nomeCommerciale });
          }
        }
      }
    }
    const texGroups = Array.from(texById.values());
    const legFromRoomsMap = new Map<string, string[]>();
    for (const g of texGroups) legFromRoomsMap.set(`${g.product_id}::${g.destination ?? ''}`, g._from_rooms);
    try {
      const texItems = computePackagedItems(texGroups, store, strategy);
      for (const item of texItems) {
        legacyRows.push({ row_id: item.row_id, product_id: item.product_id ?? null, sku_id: item.sku_id, descrizione: item.description, qty_packs: item.qty_packs, pack_size: item.pack_size, pack_unit: item.pack_unit, prezzo_unitario: item.prezzo_unitario, totale: item.totale, source: 'auto', status: 'active', is_override: false, section: item.section as CartLine['section'], from_rooms: legFromRoomsMap.get(`${item.product_id}::${item.destination ?? ''}`) ?? [] });
      }
    } catch { /* noop */ }
    for (const [, agg] of nonTexById) {
      try {
        const validSkus = store.packagingSku.filter(s => s.product_id === agg.product_id && (s.pack_size ?? 0) > 0);
        if (validSkus.length === 0) continue;
        const opts = computePackagingOptions(agg.qty_raw, validSkus, store.listino);
        const best = bestOption(opts, strategy);
        if (!best) continue;
        legacyRows.push({ row_id: crypto.randomUUID(), product_id: agg.product_id ?? null, sku_id: best.sku_id, descrizione: agg.nomeCommerciale, qty_packs: best.qty_packs, pack_size: best.pack_size, pack_unit: best.pack_unit, prezzo_unitario: best.prezzo_unitario, totale: best.totale, source: 'auto', status: 'active', is_override: false, section: agg.section, from_rooms: agg.from_rooms });
      } catch { /* noop */ }
    }
  }

  return [...rawRows, ...legacyRows];
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

/**
 * Seleziona la modalità di costruzione carrello.
 * OPTIMIZED: aggrega qty_raw di tutti gli ambienti, poi calcola packaging una volta.
 * SEPARATE: calcola packaging per ogni ambiente, poi combina.
 */
function buildCartWithMode(
  rooms: ProjectRoom[],
  store: DataStore,
  strategy: PackagingStrategy,
  mode: ConsolidationMode,
): ProjectCartRow[] {
  return mode === 'OPTIMIZED'
    ? buildCartFromRooms(rooms, store, strategy)
    : buildCartFromRoomsSeparate(rooms, store, strategy);
}

/**
 * Calcola i totali per entrambe le modalità.
 * Usato per mostrare il risparmio nell'UI.
 * Solo quando ci sono ≥2 ambienti configurati.
 */
function computeSavingsMetrics(
  rooms: ProjectRoom[],
  store: DataStore,
  strategy: PackagingStrategy,
): { cart_total_optimized: number; cart_total_separate: number; cart_savings_eur: number } {
  const configured = rooms.filter(r => r.is_configured);
  if (configured.length < 2) {
    return { cart_total_optimized: 0, cart_total_separate: 0, cart_savings_eur: 0 };
  }
  const optimizedRows = buildCartFromRooms(rooms, store, strategy);
  const separateRows = buildCartFromRoomsSeparate(rooms, store, strategy);
  const cart_total_optimized = optimizedRows.filter(r => r.status === 'active').reduce((s, r) => s + r.totale, 0);
  const cart_total_separate = separateRows.filter(r => r.status === 'active').reduce((s, r) => s + r.totale, 0);
  return { cart_total_optimized, cart_total_separate, cart_savings_eur: cart_total_separate - cart_total_optimized };
}

const initialState: ProjectState = {
  rooms: [],
  cart: [],
  strategy: 'MINIMO_SFRIDO',
  consolidation_mode: 'OPTIMIZED',
  cart_built: false,
  config_log: [],
  cart_total_optimized: 0,
  cart_total_separate: 0,
  cart_savings_eur: 0,
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
        raw_cart_lines: [],
        cart_result: null,
        step_lavorazioni: [],
        computation_errors: [],
      }],
    }));
    get().persist();
    return id;
  },

  removeRoom: (id) => {
    const remaining = get().rooms.filter(r => r.id !== id && r.is_configured);
    set(s => ({
      rooms: s.rooms.filter(r => r.id !== id),
      cart: [],
      cart_built: remaining.length > 0 ? false : true,
    }));
    useCartStore.getState().setItems([]);
    get().persist();
  },

  setRoomResult: (id, wizard_state, lines, store, result?) => {
    const step_lavorazioni = result ? buildStepLavorazioni(id, result) : [];
    const computation_errors = result ? result.computation_errors : [];
    const raw_cart_lines = result?.raw_lines ?? [];
    set(s => ({
      rooms: s.rooms.map(r =>
        r.id === id
          ? { ...r, wizard_state, cart_lines: lines, raw_cart_lines, cart_result: result ?? null, is_configured: true, step_lavorazioni, computation_errors }
          : r
      ),
    }));
    // Auto-rebuild cart immediately (full reset)
    const currentStrategy = get().strategy;
    const updatedRooms = get().rooms;
    const rows = buildCartWithMode(updatedRooms, store, currentStrategy, get().consolidation_mode);
    const savings = computeSavingsMetrics(updatedRooms, store, currentStrategy);
    set({ cart: rows, cart_built: true, ...savings });
    // Sync cart-store
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
          ? { ...r, wizard_state: null, cart_lines: [], raw_cart_lines: [], cart_result: null, is_configured: false, step_lavorazioni: [], computation_errors: [] }
          : r
      ),
      cart_built: false,
    }));
    get().persist();
  },

  buildCart: (store, strategy?) => {
    const s = strategy ?? get().strategy;
    const rows = buildCartWithMode(get().rooms, store, s, get().consolidation_mode);
    const savings = computeSavingsMetrics(get().rooms, store, s);
    set({ cart: rows, strategy: s, cart_built: true, ...savings });
    get().persist();
  },

  setStrategy: (strategy, store) => {
    if (strategy === 'MANUALE') {
      set({ strategy });
      get().persist();
      return;
    }
    const autoRows = buildCartWithMode(get().rooms, store, strategy, get().consolidation_mode);
    const manual = get().cart.filter(r => r.source === 'manual');
    const merged = [...autoRows, ...manual];
    const savings = computeSavingsMetrics(get().rooms, store, strategy);
    set({ strategy, cart: merged, cart_built: true, ...savings });
    get().persist();
  },

  setConsolidationMode: (mode, store) => {
    const autoRows = buildCartWithMode(get().rooms, store, get().strategy, mode);
    const manual = get().cart.filter(r => r.source === 'manual');
    const savings = computeSavingsMetrics(get().rooms, store, get().strategy);
    set({ consolidation_mode: mode, cart: [...autoRows, ...manual], cart_built: true, ...savings });
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
      const { rooms, cart, strategy, consolidation_mode, cart_built, config_log, cart_total_optimized, cart_total_separate, cart_savings_eur } = get();
      localStorage.setItem(LS_KEY, JSON.stringify({ rooms, cart, strategy, consolidation_mode, cart_built, config_log, cart_total_optimized, cart_total_separate, cart_savings_eur }));
    } catch { /* noop */ }
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProjectState> & { rooms: ProjectRoom[] };
        if (!parsed.config_log) parsed.config_log = [];
        parsed.rooms = parsed.rooms.map(r => ({
          ...r,
          step_lavorazioni: r.step_lavorazioni ?? [],
          computation_errors: r.computation_errors ?? [],
          raw_cart_lines: r.raw_cart_lines ?? [],
        }));
        if (!parsed.consolidation_mode) parsed.consolidation_mode = 'OPTIMIZED';
        if (parsed.cart_total_optimized === undefined) parsed.cart_total_optimized = 0;
        if (parsed.cart_total_separate === undefined) parsed.cart_total_separate = 0;
        if (parsed.cart_savings_eur === undefined) parsed.cart_savings_eur = 0;
        set({ ...parsed as ProjectState, cart_built: false });
      }
    } catch { /* noop */ }
  },
}));
