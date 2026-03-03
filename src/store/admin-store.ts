import { create } from 'zustand';
import type { StepLibraryEntry } from '../types/step';
import type { StepMapEntry } from '../types/regole';
import type { PackagingSku, ListinoSku } from '../types/packaging';
import { invalidateCache } from '../utils/data-loader';
import { setCommercialNameOverrides } from '../utils/product-names';

const LS_KEY = 'nativus_admin_overrides';

interface AdminOverrides {
  stepLibrary?: StepLibraryEntry[];
  stepMap?: StepMapEntry[];
  packagingSku?: PackagingSku[];
  listino?: ListinoSku[];
  commercialNames?: Record<string, string>;
}

interface AdminStore {
  overrides: AdminOverrides;
  isDirty: boolean;
  loadFromStorage: () => void;
  saveStepLibrary: (items: StepLibraryEntry[]) => void;
  saveStepMap: (items: StepMapEntry[]) => void;
  savePackagingSku: (items: PackagingSku[]) => void;
  saveListino: (items: ListinoSku[]) => void;
  saveCommercialNames: (names: Record<string, string>) => void;
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
    setCommercialNameOverrides(overrides.commercialNames ?? {});
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

  saveCommercialNames: (names) => {
    const overrides = { ...get().overrides, commercialNames: names };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    setCommercialNameOverrides(names);
  },

  resetAll: () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    set({ overrides: {}, isDirty: false });
    invalidateCache();
    setCommercialNameOverrides({});
  },
}));

export function getAdminOverrides(): AdminOverrides {
  return readStorage();
}

// Initialize commercial name overrides from localStorage at module load time
(function initOverrides() {
  const stored = readStorage();
  if (stored.commercialNames) {
    setCommercialNameOverrides(stored.commercialNames);
  }
})();
