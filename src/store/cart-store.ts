import { create } from 'zustand';
import type { PackagedItem } from '../types/services';
import type { PackagingStrategy } from '../types/project';

interface CartState {
  items: PackagedItem[];
  lastRemoved: PackagedItem | null;
  strategy: PackagingStrategy;
}

interface CartStore extends CartState {
  setItems: (items: PackagedItem[]) => void;
  updateQty: (row_id: string, qty: number) => void;
  removeItem: (row_id: string) => void;
  restoreLastRemoved: () => void;
  excludeItem: (row_id: string) => void;
  restoreItem: (row_id: string) => void;
  addManualItem: (item: PackagedItem) => void;
  setStrategy: (strategy: PackagingStrategy) => void;
  getActiveItems: () => PackagedItem[];
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  lastRemoved: null,
  strategy: 'MINIMO_SFRIDO',

  setItems: (items) => set({ items }),

  updateQty: (row_id, qty) => {
    if (qty <= 0) {
      get().removeItem(row_id);
      return;
    }
    set(s => ({
      items: s.items.map(i =>
        i.row_id === row_id
          ? { ...i, qty_packs: qty, totale: qty * i.prezzo_unitario }
          : i
      ),
    }));
  },

  removeItem: (row_id) => {
    const item = get().items.find(i => i.row_id === row_id) ?? null;
    set(s => ({
      items: s.items.filter(i => i.row_id !== row_id),
      lastRemoved: item,
    }));
  },

  restoreLastRemoved: () => {
    const last = get().lastRemoved;
    if (!last) return;
    set(s => ({ items: [last, ...s.items], lastRemoved: null }));
  },

  excludeItem: (row_id) => {
    set(s => ({
      items: s.items.map(i =>
        i.row_id === row_id ? { ...i, status: 'excluded' as const } : i
      ),
    }));
  },

  restoreItem: (row_id) => {
    set(s => ({
      items: s.items.map(i =>
        i.row_id === row_id ? { ...i, status: 'active' as const } : i
      ),
    }));
  },

  addManualItem: (item) => {
    set(s => ({ items: [...s.items, item], strategy: 'MANUALE' }));
  },

  setStrategy: (strategy) => {
    set({ strategy });
  },

  getActiveItems: () => get().items.filter(i => i.status === 'active'),

  getTotal: () =>
    get()
      .items.filter(i => i.status === 'active')
      .reduce((acc, i) => acc + i.totale, 0),
}));
