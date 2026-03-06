import { create } from 'zustand';
import type { StepLibraryEntry } from '../types/step';
import type { StepMapEntry } from '../types/regole';
import type { PackagingSku, ListinoSku } from '../types/packaging';
import type {
  EnvironmentMediaConfig, SupportMediaConfig, StratigraphyMediaConfig,
  ApplicationStepManual, Tool, OperationalSheetTemplate, TextureMediaConfig,
} from '../types/cms';
import { invalidateCache } from '../utils/data-loader';
import { setCommercialNameOverrides } from '../utils/product-names';

const LS_KEY = 'nativus_admin_overrides';
const CMS_LS_KEY = 'nativus_admin_cms';

export interface AdminOverrides {
  stepLibrary?: StepLibraryEntry[];
  stepMap?: StepMapEntry[];
  packagingSku?: PackagingSku[];
  listino?: ListinoSku[];
  commercialNames?: Record<string, string>;
  ambienti?: Array<Record<string, unknown>>;
  supporti?: Array<Record<string, unknown>>;
  dinInputs?: Array<Record<string, unknown>>;
  dinOrderRules?: Array<Record<string, unknown>>;
  textureLines?: Array<Record<string, unknown>>;
  textureStyles?: Array<Record<string, unknown>>;
  laminePatterns?: Array<Record<string, unknown>>;
  colorOverrides?: Record<string, { is_active?: boolean; label?: string }>;
}

export interface AdminCMS {
  environmentMedia: EnvironmentMediaConfig[];
  supportMedia: SupportMediaConfig[];
  stratigraphyMedia: StratigraphyMediaConfig[];
  stepManuals: ApplicationStepManual[];
  tools: Tool[];
  operationalSheetTemplates: OperationalSheetTemplate[];
  textureMedia: TextureMediaConfig[];
}

export interface AdminStore {
  overrides: AdminOverrides;
  cms: AdminCMS;
  isDirty: boolean;
  loadFromStorage: () => void;
  saveStepLibrary: (items: StepLibraryEntry[]) => void;
  saveStepMap: (items: StepMapEntry[]) => void;
  savePackagingSku: (items: PackagingSku[]) => void;
  saveListino: (items: ListinoSku[]) => void;
  saveCommercialNames: (names: Record<string, string>) => void;
  saveAmbienti: (items: Array<Record<string, unknown>>) => void;
  saveSupporti: (items: Array<Record<string, unknown>>) => void;
  saveDinInputs: (items: Array<Record<string, unknown>>) => void;
  saveDinOrderRules: (items: Array<Record<string, unknown>>) => void;
  saveTextureLines: (items: Array<Record<string, unknown>>) => void;
  saveTextureStyles: (items: Array<Record<string, unknown>>) => void;
  saveLaminePatterns: (items: Array<Record<string, unknown>>) => void;
  saveColorOverrides: (overrides: Record<string, { is_active?: boolean; label?: string }>) => void;
  saveCMS: (cms: Partial<AdminCMS>) => void;
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

const DEFAULT_CMS: AdminCMS = {
  environmentMedia: [],
  supportMedia: [],
  stratigraphyMedia: [],
  stepManuals: [],
  tools: [],
  operationalSheetTemplates: [],
  textureMedia: [],
};

function readCMS(): AdminCMS {
  try {
    const raw = localStorage.getItem(CMS_LS_KEY);
    return raw ? { ...DEFAULT_CMS, ...(JSON.parse(raw) as Partial<AdminCMS>) } : { ...DEFAULT_CMS };
  } catch {
    return { ...DEFAULT_CMS };
  }
}

function writeCMS(cms: AdminCMS) {
  try {
    localStorage.setItem(CMS_LS_KEY, JSON.stringify(cms));
  } catch {
    console.warn('Admin store: impossibile scrivere CMS su localStorage');
  }
}

function makeSimpleSaver(key: keyof AdminOverrides) {
  return (items: unknown) => {
    return (set: (s: Partial<{ overrides: AdminOverrides; isDirty: boolean }>) => void, get: () => { overrides: AdminOverrides }) => {
      const overrides = { ...get().overrides, [key]: items };
      writeStorage(overrides);
      set({ overrides, isDirty: false });
      invalidateCache();
    };
  };
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  overrides: {},
  cms: { ...DEFAULT_CMS },
  isDirty: false,

  loadFromStorage: () => {
    const overrides = readStorage();
    const cms = readCMS();
    set({ overrides, cms, isDirty: false });
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

  saveAmbienti: (items) => {
    const overrides = { ...get().overrides, ambienti: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveSupporti: (items) => {
    const overrides = { ...get().overrides, supporti: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveDinInputs: (items) => {
    const overrides = { ...get().overrides, dinInputs: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveDinOrderRules: (items) => {
    const overrides = { ...get().overrides, dinOrderRules: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveTextureLines: (items) => {
    const overrides = { ...get().overrides, textureLines: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveTextureStyles: (items) => {
    const overrides = { ...get().overrides, textureStyles: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveLaminePatterns: (items) => {
    const overrides = { ...get().overrides, laminePatterns: items };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveColorOverrides: (colorOverrides) => {
    const overrides = { ...get().overrides, colorOverrides };
    writeStorage(overrides);
    set({ overrides, isDirty: false });
    invalidateCache();
  },

  saveCMS: (partial) => {
    const cms = { ...get().cms, ...partial };
    writeCMS(cms);
    set({ cms, isDirty: false });
  },

  resetAll: () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    try { localStorage.removeItem(CMS_LS_KEY); } catch { /* noop */ }
    set({ overrides: {}, cms: { ...DEFAULT_CMS }, isDirty: false });
    invalidateCache();
    setCommercialNameOverrides({});
  },
}));

void makeSimpleSaver;

export function getAdminOverrides(): AdminOverrides {
  return readStorage();
}

(function initOverrides() {
  const stored = readStorage();
  if (stored.commercialNames) {
    setCommercialNameOverrides(stored.commercialNames);
  }
})();
