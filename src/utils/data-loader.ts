import type { Ambiente, Macro, StepType } from '../types/enums';
import type { Supporto } from '../types/supporto';
import type { DecisionRule, StepMapEntry } from '../types/regole';
import type { StepLibraryEntry } from '../types/step';
import type { Prodotto } from '../types/prodotto';
import type { PackagingSku, ListinoSku } from '../types/packaging';
import type {
  TextureLine,
  TextureStyle,
  LaminePattern,
  ColorPalette,
  PaletteColor,
  RalColor,
  NcsColor,
  PantoneColor,
  TextureOrderRule,
  TexturePackagingSku,
  TexOpParam,
  ColorStandard,
} from '../types/texture';
import type { ProtettivoDataset } from '../types/protettivi';
import type { DinInput, DinOrderRule } from '../types/din';

export interface DataStore {
  ambienti: Ambiente[];
  macros: Macro[];
  stepTypes: StepType[];
  supporti: Supporto[];
  decisionTable: DecisionRule[];
  stepMap: StepMapEntry[];
  stepLibrary: StepLibraryEntry[];
  prodotti: Prodotto[];
  packagingSku: PackagingSku[];
  listino: ListinoSku[];
  textureLines: TextureLine[];
  textureStyles: TextureStyle[];
  laminePatterns: LaminePattern[];
  colorPalettesMeta: ColorPalette[];
  colorStandards: ColorStandard[];
  textureOrderRules: TextureOrderRule[];
  texturePackagingSku: TexturePackagingSku[];
  texOpParams: TexOpParam[];
  protettiviH2o: ProtettivoDataset;
  protettiviS: ProtettivoDataset;
  dinInputs: DinInput[];
  dinOrderRules: DinOrderRule[];
  colorNatural24: PaletteColor[];
  colorSense24: PaletteColor[];
  colorDekora24: PaletteColor[];
  colorRal: RalColor[];
  colorNcs: NcsColor[];
  colorPantone: PantoneColor[];
  meta: { version: string; generated_at: string; hash: string };
}

const staticModules = import.meta.glob('../data/static/**/*.json', { eager: true });

function getStatic<T>(path: string): T {
  const key = `../data/static/${path}`;
  const mod = staticModules[key] as { default: T } | undefined;
  if (!mod) throw new Error(`[DataLoader] Missing static file: ${key}`);
  return mod.default;
}

let cached: DataStore | null = null;

const ADMIN_LS_KEY = 'nativus_admin_overrides';

interface AdminLoaderOverrides {
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

function loadAdminOverrides(): AdminLoaderOverrides {
  try {
    const raw = localStorage.getItem(ADMIN_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function applyColorOverrides<T extends Record<string, unknown>>(
  colors: T[],
  idKey: string,
  overrides: Record<string, { is_active?: boolean; label?: string }> | undefined,
): T[] {
  if (!overrides || Object.keys(overrides).length === 0) return colors;
  return colors.map(c => {
    const id = c[idKey] as string;
    const ov = overrides[id];
    if (!ov) return c;
    const merged = { ...c };
    if (ov.is_active !== undefined) (merged as Record<string, unknown>).is_active = ov.is_active;
    if (ov.label !== undefined) {
      if ('ral_label' in merged) (merged as Record<string, unknown>).ral_label = ov.label;
      else if ('ncs_label' in merged) (merged as Record<string, unknown>).ncs_label = ov.label;
      else if ('pantone_label' in merged) (merged as Record<string, unknown>).pantone_label = ov.label;
    }
    return merged;
  });
}

export function loadDataStore(adminOverride?: AdminLoaderOverrides): DataStore {
  if (cached && !adminOverride) return cached;

  const adminOv: AdminLoaderOverrides = adminOverride ?? loadAdminOverrides();

  const staticStepMap: StepMapEntry[]     = getStatic('step-map.json');
  const staticStepLib: StepLibraryEntry[] = getStatic('step-library.json');
  const staticPackSku: PackagingSku[]     = getStatic('packaging-sku.json');
  const staticListino: ListinoSku[]       = getStatic('listino.json');

  // Merge strategy: static data is the authoritative base.
  // Admin overrides can UPDATE existing entries or ADD new ones, but never silently
  // remove entries that exist only in the static file.
  function mergeById<T extends { [key: string]: unknown }>(
    staticArr: T[],
    override: T[] | undefined,
    idKey: keyof T,
  ): T[] {
    if (!override || override.length === 0) return staticArr;
    const overrideMap = new Map(override.map(e => [e[idKey], e]));
    const staticMap   = new Map(staticArr.map(e => [e[idKey], e]));
    // Start from static; apply overrides; then add admin-only entries
    const merged = new Map<unknown, T>();
    for (const [k, v] of staticMap) merged.set(k, v);
    for (const [k, v] of overrideMap) merged.set(k, v);
    return Array.from(merged.values());
  }

  // step-map uses composite key (rule_id + step_order)
  function mergeStepMap(
    staticArr: StepMapEntry[],
    override: StepMapEntry[] | undefined,
  ): StepMapEntry[] {
    if (!override || override.length === 0) return staticArr;
    type Key = string;
    const key = (e: StepMapEntry): Key => `${e.rule_id}::${e.step_order}`;
    const merged = new Map<Key, StepMapEntry>();
    for (const e of staticArr) merged.set(key(e), e);
    for (const e of override)   merged.set(key(e), e);  // override wins on same key
    return Array.from(merged.values()).sort((a, b) =>
      a.rule_id.localeCompare(b.rule_id) || a.step_order - b.step_order,
    );
  }

  const store: DataStore = {
    ambienti:          mergeById(getStatic('ambienti.json') as unknown as { [k: string]: unknown }[], adminOv.ambienti, 'env_id') as unknown as Ambiente[],
    macros:            getStatic('macros.json'),
    stepTypes:         getStatic('step-types.json'),
    supporti:          mergeById(getStatic('supporti.json') as unknown as { [k: string]: unknown }[], adminOv.supporti, 'support_id') as unknown as Supporto[],
    decisionTable:     getStatic('decision-table.json'),
    stepMap:           mergeStepMap(staticStepMap, adminOv.stepMap),
    stepLibrary:       mergeById(staticStepLib as unknown as { [k: string]: unknown }[], adminOv.stepLibrary as unknown as { [k: string]: unknown }[] | undefined, 'step_id') as unknown as StepLibraryEntry[],
    prodotti:          getStatic('prodotti.json'),
    packagingSku:      mergeById(staticPackSku as unknown as { [k: string]: unknown }[], adminOv.packagingSku as unknown as { [k: string]: unknown }[] | undefined, 'sku_id') as unknown as PackagingSku[],
    listino:           mergeById(staticListino as unknown as { [k: string]: unknown }[], adminOv.listino as unknown as { [k: string]: unknown }[] | undefined, 'sku_id') as unknown as ListinoSku[],
    textureLines:      mergeById(getStatic('texture-lines.json') as unknown as { [k: string]: unknown }[], adminOv.textureLines, 'line_id') as unknown as TextureLine[],
    textureStyles:     mergeById(getStatic('texture-styles.json') as unknown as { [k: string]: unknown }[], adminOv.textureStyles, 'style_id') as unknown as TextureStyle[],
    laminePatterns:    mergeById(getStatic('lamine-patterns.json') as unknown as { [k: string]: unknown }[], adminOv.laminePatterns, 'pattern_id') as unknown as LaminePattern[],
    colorPalettesMeta: getStatic('color-palettes-meta.json'),
    colorStandards:    getStatic('color-standards.json'),
    textureOrderRules: getStatic('texture-order-rules.json'),
    texturePackagingSku: getStatic('texture-packaging-sku.json'),
    texOpParams:       getStatic('tex-op-params.json'),
    protettiviH2o:     getStatic('protettivi-h2o.json'),
    protettiviS:       getStatic('protettivi-s.json'),
    dinInputs:         mergeById(getStatic('din-inputs.json') as unknown as { [k: string]: unknown }[], adminOv.dinInputs, 'input_id') as unknown as DinInput[],
    dinOrderRules:     mergeById(getStatic('din-order-rules.json') as unknown as { [k: string]: unknown }[], adminOv.dinOrderRules, 'rule_id') as unknown as DinOrderRule[],
    colorNatural24:    getStatic('color-palettes/natural-24.json'),
    colorSense24:      getStatic('color-palettes/sense-24.json'),
    colorDekora24:     getStatic('color-palettes/dekora-24.json'),
    colorRal:          applyColorOverrides(getStatic('color-palettes/ral-classic.json') as unknown as Record<string, unknown>[], 'ral_id', adminOv.colorOverrides) as unknown as RalColor[],
    colorNcs:          applyColorOverrides(getStatic('color-palettes/ncs.json') as unknown as Record<string, unknown>[], 'ncs_id', adminOv.colorOverrides) as unknown as NcsColor[],
    colorPantone:      applyColorOverrides(getStatic('color-palettes/pantone-c.json') as unknown as Record<string, unknown>[], 'pantone_id', adminOv.colorOverrides) as unknown as PantoneColor[],
    meta:              getStatic('_meta.json'),
  };

  if (!adminOverride) cached = store;
  return store;
}

export function invalidateCache(): void {
  cached = null;
}

export function getProductById(store: DataStore, productId: string): Prodotto | undefined {
  return store.prodotti.find(p => p.product_id === productId);
}

export function getSkusByProductId(store: DataStore, productId: string): PackagingSku[] {
  return store.packagingSku.filter(s => s.product_id === productId);
}

export function getPriceBySkuId(store: DataStore, skuId: string): number {
  return store.listino.find(l => l.sku_id === skuId)?.prezzo_listino ?? 0;
}

export function getStepById(store: DataStore, stepId: string): StepLibraryEntry | undefined {
  return store.stepLibrary.find(s => s.step_id === stepId);
}

export function getStepsForRule(store: DataStore, ruleId: string): StepMapEntry[] {
  return store.stepMap
    .filter(sm => sm.rule_id === ruleId)
    .sort((a, b) => a.step_order - b.step_order);
}

export function getSupportiByMacro(store: DataStore, macroId: 'FLOOR' | 'WALL'): Supporto[] {
  return store.supporti.filter(s => s.macro_id === macroId);
}
