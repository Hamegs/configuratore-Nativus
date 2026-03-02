import { create } from 'zustand';
import type { ProjectRoom, ProjectCartRow, AggregatedRawQty, PackagingStrategy, ConfigLogEntry } from '../types/project';
import type { CartLine } from '../types/cart';
import type { WizardState } from '../types/wizard-state';
import type { CartResult } from '../engine/cart-calculator';
import { buildCartFromAggregated } from '../engine/packaging-optimizer';
import type { DataStore } from '../utils/data-loader';

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
  setRoomResult: (id: string, state: WizardState, lines: CartLine[], result?: CartResult) => void;
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

function aggregate(rooms: ProjectRoom[]): AggregatedRawQty[] {
  const map = new Map<string, AggregatedRawQty>();
  for (const room of rooms) {
    if (!room.is_configured) continue;
    for (const line of room.cart_lines) {
      const pid = line.product_id ?? line.sku_id;
      const raw = line.qty_raw ?? line.qty * (line.pack_size ?? 1);
      if (map.has(pid)) {
        const existing = map.get(pid)!;
        existing.qty_raw += raw;
        if (!existing.from_rooms.includes(room.custom_name || room.room_type)) {
          existing.from_rooms.push(room.custom_name || room.room_type);
        }
      } else {
        map.set(pid, {
          product_id: pid,
          sku_id_default: line.sku_id,
          descrizione: line.descrizione,
          qty_raw: raw,
          pack_size_default: line.pack_size ?? 1,
          pack_unit: line.pack_unit ?? 'kg',
          section: line.section,
          from_rooms: [room.custom_name || room.room_type],
        });
      }
    }
  }
  return Array.from(map.values());
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
      }],
    }));
    get().persist();
    return id;
  },

  removeRoom: (id) => {
    set(s => ({ rooms: s.rooms.filter(r => r.id !== id), cart_built: false }));
    get().persist();
  },

  setRoomResult: (id, wizard_state, lines, result?) => {
    set(s => ({
      rooms: s.rooms.map(r =>
        r.id === id
          ? { ...r, wizard_state, cart_lines: lines, cart_result: result ?? null, is_configured: true }
          : r
      ),
      cart_built: false,
    }));
    get().persist();
  },

  unconfigureRoom: (id) => {
    set(s => ({
      rooms: s.rooms.map(r =>
        r.id === id
          ? { ...r, wizard_state: null, cart_lines: [], cart_result: null, is_configured: false }
          : r
      ),
      cart_built: false,
    }));
    get().persist();
  },

  buildCart: (store, strategy?) => {
    const s = strategy ?? get().strategy;
    const aggregated = aggregate(get().rooms);
    const rows = buildCartFromAggregated(aggregated, store.packagingSku, store.listino, s);
    set({ cart: rows, strategy: s, cart_built: true });
    get().persist();
  },

  setStrategy: (strategy, store) => {
    if (strategy === 'MANUALE') {
      // solo sblocca — non ricalcola
      set({ strategy });
      get().persist();
      return;
    }
    const aggregated = aggregate(get().rooms);
    const autoRows = buildCartFromAggregated(aggregated, store.packagingSku, store.listino, strategy);
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
          descrizione: skuInfo?.descrizione_sku ?? r.descrizione,
          prezzo_unitario: price,
          totale: qty_packs * price,
          is_override: true,
          status: 'active' as const,
        };
      }),
    }));
    // log modifica
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
      descrizione: skuInfo?.descrizione_sku ?? sku_id,
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
    // Aggiunta manuale → forza modalità MANUALE
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
        const parsed = JSON.parse(raw) as ProjectState;
        if (!parsed.config_log) parsed.config_log = [];
        set(parsed);
      }
    } catch { /* noop */ }
  },
}));
