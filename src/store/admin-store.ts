import { create } from 'zustand';
import type { StepLibraryEntry } from '../types/step';
import type { StepMapEntry } from '../types/regole';
import type { PackagingSku, ListinoSku } from '../types/packaging';
import { invalidateCache } from '../utils/data-loader';

const LS_KEY = 'nativus_admin_overrides';

interface AdminOverrides {
  stepLibrary?: StepLibraryEntry[];
  stepMap?: StepMapEntry[];
  packagingSku?: PackagingSku[];
  listino?: ListinoSku[];
}

interface AdminStore {
  overrides: AdminOverrides;
  isDirty: boolean;
  loadFromStorage: () => void;
  saveStepLibrary: (items: StepLibraryEntry[]) => void;
  saveStepMap: (items: StepMapEntry[]) => void;
  savePackagingSku: (items: PackagingSku[]) => void;
  saveListino: (items: ListinoSku[]) => void;
  resetAll: () => void;
}

function readStorage(): AdminOverrides {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as AdminOverrides) : {};
  } catch {
    return {};
  }
}

function writeStorage(overrides: AdminOverrides) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(overrides));
  } catch {
    console.warn('Admin store: impossibile scrivere su localStorage');
  }
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  overrides: {},
  isDirty: false,

  loadFromStorage: () => {
    const overrides = readStorage();
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveStepLibrary: (items) => {
    const overrides = { ...get().overrides, stepLibrary: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveStepMap: (items) => {
    const overrides = { ...get().overrides, stepMap: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  savePackagingSku: (items) => {
    const overrides = { ...get().overrides, packagingSku: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveListino: (items) => {
    const overrides = { ...get().overrides, listino: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  resetAll: () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    set({ overrides: {}, isDirty: false });
    invalidateCache();
  },
}));

export function getAdminOverrides(): AdminOverrides {
  return readStorage();
}
