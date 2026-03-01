import { create } from 'zustand';
import type { ProjectRoom, ProjectCartRow, AggregatedRawQty, PackagingStrategy } from '../types/project';
import type { CartLine } from '../types/cart';
import type { WizardState } from '../types/wizard-state';
import { buildCartFromAggregated } from '../engine/packaging-optimizer';
import type { DataStore } from '../utils/data-loader';

const LS_KEY = 'nativus_project';

interface ProjectState {
  rooms: ProjectRoom[];
  cart: ProjectCartRow[];
  strategy: PackagingStrategy;
  cart_built: boolean;
}

interface ProjectStore extends ProjectState {
  addRoom: (room_type: string, custom_name: string) => string;
  removeRoom: (id: string) => void;
  setRoomResult: (id: string, state: WizardState, lines: CartLine[]) => void;
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

const initialState: ProjectState = {
  rooms: [],
  cart: [],
  strategy: 'MINIMO_SFRIDO',
  cart_built: false,
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...initialState,

  addRoom: (room_type, custom_name) => {
    const id = crypto.randomUUID();
    set(s => ({ rooms: [...s.rooms, { id, room_type, custom_name, is_configured: false, wizard_state: null, cart_lines: [] }] }));
    get().persist();
    return id;
  },

  removeRoom: (id) => {
    set(s => ({ rooms: s.rooms.filter(r => r.id !== id), cart_built: false }));
    get().persist();
  },

  setRoomResult: (id, wizard_state, lines) => {
    set(s => ({
      rooms: s.rooms.map(r => r.id === id ? { ...r, wizard_state, cart_lines: lines, is_configured: true } : r),
      cart_built: false,
    }));
    get().persist();
  },

  unconfigureRoom: (id) => {
    set(s => ({
      rooms: s.rooms.map(r => r.id === id ? { ...r, wizard_state: null, cart_lines: [], is_configured: false } : r),
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
    const aggregated = aggregate(get().rooms);
    const autoRows = buildCartFromAggregated(aggregated, store.packagingSku, store.listino, strategy);
    // preserve manual rows and overrides; rebuild auto rows
    const manual = get().cart.filter(r => r.source === 'manual');
    const merged = [...autoRows, ...manual];
    set({ strategy, cart: merged, cart_built: true });
    get().persist();
  },

  overrideCartRow: (row_id, sku_id, qty_packs, store) => {
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
    get().persist();
  },

  excludeCartRow: (row_id) => {
    set(s => ({ cart: s.cart.map(r => r.row_id === row_id ? { ...r, status: 'excluded' as const } : r) }));
    get().persist();
  },

  restoreCartRow: (row_id) => {
    set(s => ({ cart: s.cart.map(r => r.row_id === row_id ? { ...r, status: 'active' as const } : r) }));
    get().persist();
  },

  removeCartRow: (row_id) => {
    set(s => ({ cart: s.cart.filter(r => r.row_id !== row_id) }));
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
    set(s => ({ cart: [...s.cart, row] }));
    get().persist();
  },

  reset: () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    set({ ...initialState });
  },

  persist: () => {
    try {
      const { rooms, cart, strategy, cart_built } = get();
      localStorage.setItem(LS_KEY, JSON.stringify({ rooms, cart, strategy, cart_built }));
    } catch { /* noop */ }
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) set(JSON.parse(raw) as ProjectState);
    } catch { /* noop */ }
  },
}));
