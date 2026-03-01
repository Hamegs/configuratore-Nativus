import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Papa from 'papaparse';

const ROOT = path.resolve(process.cwd());
const CSV_DIR = path.join(ROOT, 'csv-data');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'static');

function readCsv<T extends Record<string, string>>(filename: string): T[] {
  const filePath = path.join(CSV_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`  [MISSING] ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse<T>(content, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() });
  if (result.errors.length > 0) {
    const serious = result.errors.filter(e => e.type !== 'FieldMismatch');
    if (serious.length > 0) {
      console.error(`  [PARSE ERROR] ${filename}:`, serious);
    }
  }
  return result.data.map(row => {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      clean[k.trim()] = typeof v === 'string' ? v.trim() : String(v ?? '');
    }
    return clean as T;
  });
}

function writeJson(filename: string, data: unknown): void {
  const filePath = path.join(OUT_DIR, filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  const rows = Array.isArray(data) ? data.length : Object.keys(data as object).length;
  console.log(`  [OK] ${filename} (${rows} records)`);
}

function n(val: string): number {
  const v = parseFloat(val);
  return isNaN(v) ? 0 : v;
}

function ni(val: string): number {
  const v = parseInt(val, 10);
  return isNaN(v) ? 0 : v;
}

function bool(val: string): boolean {
  return val === '1' || val.toLowerCase() === 'true';
}

function nullableFloat(val: string): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const v = parseFloat(val);
  return isNaN(v) ? null : v;
}

function nullableStr(val: string): string | null {
  return val === '' ? null : val;
}

console.log('\n=== Nativus CSV → JSON Conversion ===\n');

if (!fs.existsSync(CSV_DIR)) {
  console.error(`ERROR: csv-data/ directory not found at ${CSV_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const colorPalDir = path.join(OUT_DIR, 'color-palettes');
if (!fs.existsSync(colorPalDir)) fs.mkdirSync(colorPalDir, { recursive: true });

// ─── Enums ─────────────────────────────────────────────────────────────────

const ambienti = readCsv('ENUM_AMBIENTI.csv').map(r => ({
  env_id: r.env_id,
  name: r.name,
}));
writeJson('ambienti.json', ambienti);

const macros = readCsv('ENUM_MACRO.csv').map(r => ({
  macro_id: r.macro_id,
  name: r.name,
}));
writeJson('macros.json', macros);

const stepTypes = readCsv('ENUM_STEP_TYPE.csv').map(r => ({
  step_type_id: r.step_type_id,
  name: r.name,
}));
writeJson('step-types.json', stepTypes);

// ─── Supporti ──────────────────────────────────────────────────────────────

const supporti = readCsv('SUPPORTI.csv').map(r => ({
  support_id: r.support_id,
  macro_id: r.macro_id,
  name: r.name,
}));
writeJson('supporti.json', supporti);

// ─── Decision Table ────────────────────────────────────────────────────────

const decisionTable = readCsv('REGOLE_DECISION_TABLE.csv').map(r => ({
  rule_id: r.rule_id,
  support_id: r.support_id,
  env_id: r.env_id,
  din: r.din,
  zona_doccia: r.zona_doccia,
  humidity_band: nullableStr(r.humidity_band),
  cohesion: nullableStr(r.cohesion),
  cracks: nullableStr(r.cracks),
  tile_bedding: nullableStr(r.tile_bedding),
  hollow: nullableStr(r.hollow),
}));
writeJson('decision-table.json', decisionTable);

// Check for duplicate rule_ids
const ruleIds = decisionTable.map(r => r.rule_id);
const dupRules = ruleIds.filter((id, i) => ruleIds.indexOf(id) !== i);
if (dupRules.length > 0) {
  console.error(`  [DATA ERROR] Duplicate rule_ids in decision table: ${dupRules.join(', ')}`);
}

// ─── Step Map ──────────────────────────────────────────────────────────────

const stepMap = readCsv('REGOLE_STEP_MAP.csv').map(r => ({
  rule_id: r.rule_id,
  step_order: ni(r.step_order),
  step_id: r.step_id,
}));
writeJson('step-map.json', stepMap);

// ─── Step Library ──────────────────────────────────────────────────────────

const stepLibrary = readCsv('STEP_LIBRARY.csv').map(r => ({
  step_id: r.step_id,
  step_type_id: r.step_type_id,
  name: r.name,
  product_id: nullableStr(r.product_id),
  qty: nullableFloat(r.qty),
  unit: nullableStr(r.unit),
}));
writeJson('step-library.json', stepLibrary);

// ─── Prodotti ──────────────────────────────────────────────────────────────

const prodotti = readCsv('PRODOTTI_FULL_FROM_LISTINO_v8.csv').map(r => ({
  product_id: r.product_id,
  name: r.name,
  type: r.type ?? '',
  unit: r.unit ?? '',
}));
writeJson('prodotti.json', prodotti);

// ─── Packaging SKU ─────────────────────────────────────────────────────────

const packagingSku = readCsv('PACKAGING_SKU_ALL_v8.csv').map(r => ({
  sku_id: r.sku_id,
  product_id: r.product_id,
  descrizione_sku: r.descrizione_sku,
  pack_size: nullableFloat(r.pack_size),
  pack_unit: r.pack_unit ?? '',
  componenti: r.componenti ?? '',
  note_packaging: r.note_packaging ?? '',
}));
writeJson('packaging-sku.json', packagingSku);

// ─── Listino ───────────────────────────────────────────────────────────────

const listino = readCsv('LISTINO_SKU_ALL_v8.csv').map(r => ({
  sku_id: r.sku_id,
  prezzo_listino: n(r.prezzo_listino),
  valuta: r.valuta ?? 'EUR',
  valid_from: r.valid_from ?? '',
  valid_to: r.valid_to ?? '',
  note_prezzo: r.note_prezzo ?? '',
}));
writeJson('listino.json', listino);

// ─── Texture Enums ─────────────────────────────────────────────────────────

const textureLines = readCsv('TEX_ENUM_TEXTURE_LINE.csv').map(r => ({
  line_id: r.line_id,
  name: r.name,
  notes: r.notes ?? '',
}));
writeJson('texture-lines.json', textureLines);

const textureStyles = readCsv('TEX_ENUM_TEXTURE_STYLE.csv').map(r => ({
  style_id: r.style_id,
  name: r.name,
  passes_total: ni(r.passes_total),
  color_roles: r.color_roles ?? '',
  rules: r.rules ?? '',
}));
writeJson('texture-styles.json', textureStyles);

const laminePatterns = readCsv('TEX_LAMINE_PATTERN.csv').map(r => ({
  pattern_id: r.pattern_id,
  name: r.name,
}));
writeJson('lamine-patterns.json', laminePatterns);

const colorPalettesMeta = readCsv('TEX_COLOR_PALETTES.csv').map(r => ({
  palette_id: r.palette_id,
  name: r.name,
  standard: r.standard,
}));
writeJson('color-palettes-meta.json', colorPalettesMeta);

const colorStandards = readCsv('TEX_ENUM_COLOR_STANDARD.csv').map(r => ({
  standard_id: r.standard_id,
  name: r.name,
}));
writeJson('color-standards.json', colorStandards);

// ─── Texture Order Rules & Packaging ───────────────────────────────────────

const textureOrderRules = readCsv('TEX_ORDER_RULES.csv').map(r => ({
  rule_id: r.rule_id,
  line_id: r.line_id,
  mode: r.mode ?? '',
  style_id: r.style_id ?? '',
  pack_policy: r.pack_policy ?? '',
  logic: r.logic ?? '',
}));
writeJson('texture-order-rules.json', textureOrderRules);

const texturePackagingSku = readCsv('TEX_PACKAGING_SKU_v2.csv').map(r => ({
  sku_id: r.sku_id,
  line_id: r.line_id ?? '',
  pack_size_mq: nullableFloat(r.pack_size_mq),
  component: r.component ?? '',
  mode: r.mode ?? '',
  param: r.param ?? '',
  product_id: r.product_id ?? '',
  pack_driver: r.pack_driver ?? '',
  pack_size: nullableFloat(r.pack_size),
  pack_unit: r.pack_unit ?? '',
  notes: r.notes ?? '',
}));
writeJson('texture-packaging-sku.json', texturePackagingSku);

const texOpParams = readCsv('TEX_OP_PARAMS.csv').map(r => ({
  item: r.item,
  potlife_min: r.potlife_min ?? '',
  min_overcoat: r.min_overcoat ?? '',
  max_overcoat: r.max_overcoat ?? '',
  sanding: r.sanding ?? '',
}));
writeJson('tex-op-params.json', texOpParams);

// ─── Protettivi H2O ────────────────────────────────────────────────────────

const protettiviH2oOpParams = readCsv('PROTETTIVI_OP_PARAMS_H2O_v8.csv').map(r => ({
  protettivo: r.protettivo,
  line_id: r.line_id ?? '',
  passaggi: r.passaggi ?? '',
  consumo_g_m2_per_passaggio: r.consumo_g_m2_per_passaggio ?? '',
  diluizione_percent: r.diluizione_percent ?? '',
  pot_life_min: r.pot_life_min ?? '',
  t_min_h: r.t_min_h ?? '',
  t_max_h: r.t_max_h ?? '',
  note: r.note ?? '',
}));

const protettiviH2oRules = readCsv('TEX_PROTETTIVI_RULES_H2O_v8.csv').map(r => ({
  rule_id: r.rule_id,
  line_id: r.line_id ?? '',
  style_id: r.style_id ?? '',
  mode: r.mode ?? '',
  note: r.note ?? '',
}));

const protettiviH2oNote = readCsv('NOTE_OPERATIVE_PROTETTIVI_H2O_v8.csv').map(r => ({
  voce: r.voce,
  dato: r.dato,
}));

writeJson('protettivi-h2o.json', {
  op_params: protettiviH2oOpParams,
  rules: protettiviH2oRules,
  note_operative: protettiviH2oNote,
});

// ─── Protettivi Solvente ───────────────────────────────────────────────────

const protettiviSOpParams = readCsv('PROTETTIVI_OP_PARAMS_S_v1.csv').map(r => ({
  protettivo: r.protettivo,
  line_id: r.line_id ?? '',
  passaggi: r.passaggi ?? '',
  consumo_g_m2_per_passaggio: r.consumo_g_m2_per_passaggio ?? '',
  diluizione_percent: r.diluizione_percent ?? '',
  pot_life_min: r.pot_life_min ?? '',
  t_min_h: r.t_min_h ?? '',
  t_max_h: r.t_max_h ?? '',
  note: r.note ?? '',
}));

const protettiviSRules = readCsv('TEX_PROTETTIVI_RULES_S_v1.csv').map(r => ({
  rule_id: r.rule_id,
  line_id: r.line_id ?? '',
  style_id: r.style_id ?? '',
  mode: r.mode ?? '',
  note: r.note ?? '',
}));

const protettiviSNote = readCsv('NOTE_OPERATIVE_PROTETTIVI_S_v1.csv').map(r => ({
  voce: r.voce,
  dato: r.dato,
}));

writeJson('protettivi-s.json', {
  op_params: protettiviSOpParams,
  rules: protettiviSRules,
  note_operative: protettiviSNote,
});

// ─── DIN ───────────────────────────────────────────────────────────────────

const dinInputs = readCsv('DIN_INPUTS.csv').map(r => ({
  input_id: r.input_id,
  label: r.label,
  driver: r.driver,
  unit: r.unit ?? '',
  default: r.default ?? '',
  required: r.required,
  applies_if: r.applies_if,
}));
writeJson('din-inputs.json', dinInputs);

const dinOrderRules = readCsv('DIN_ORDER_RULES.csv').map(r => ({
  rule_id: r.rule_id,
  applies_if: r.applies_if,
  product_id: r.product_id,
  calc: r.calc,
  notes: r.notes ?? '',
}));
writeJson('din-order-rules.json', dinOrderRules);

// ─── Extra Inputs ──────────────────────────────────────────────────────────

const inputsExtraH2o = readCsv('TEX_INPUTS_EXTRA_H2O_v8.csv').map(r => ({
  driver: r.driver,
  label_it: r.label_it,
  unit: r.unit ?? '',
  default: r.default ?? '',
  required: r.required,
  applies_if: r.applies_if,
  notes: r.notes ?? '',
}));
writeJson('inputs-extra-h2o.json', inputsExtraH2o);

const inputsExtraS = readCsv('TEX_INPUTS_EXTRA_S_v1.csv').map(r => ({
  driver: r.driver,
  label_it: r.label_it,
  unit: r.unit ?? '',
  default: r.default ?? '',
  required: r.required,
  applies_if: r.applies_if,
  notes: r.notes ?? '',
}));
writeJson('inputs-extra-s.json', inputsExtraS);

// ─── Color Palettes ────────────────────────────────────────────────────────

const natural24 = readCsv('TEX_ENUM_NATURAL_24.csv').map(r => ({
  palette_id: r.palette_id,
  color_id: r.color_id,
  label: r.label,
  family: r.family,
  shade: r.shade,
  is_active: bool(r.is_active),
}));
writeJson('color-palettes/natural-24.json', natural24);

const sense24 = readCsv('TEX_ENUM_SENSE_24.csv').map(r => ({
  palette_id: r.palette_id,
  color_id: r.color_id,
  label: r.label,
  family: r.family,
  shade: r.shade,
  is_active: bool(r.is_active),
}));
writeJson('color-palettes/sense-24.json', sense24);

const dekora24 = readCsv('TEX_ENUM_DEKORA_24.csv').map(r => ({
  palette_id: r.palette_id,
  color_id: r.color_id,
  label: r.label,
  family: r.family,
  shade: r.shade,
  is_active: bool(r.is_active),
}));
writeJson('color-palettes/dekora-24.json', dekora24);

const ralClassic = readCsv('TEX_ENUM_RAL_CLASSIC.csv').map(r => ({
  ral_id: r.ral_id,
  ral_code: r.ral_code,
  ral_label: r.ral_label,
  is_active: bool(r.is_active),
}));
writeJson('color-palettes/ral-classic.json', ralClassic);

const ncs = readCsv('TEX_ENUM_NCS.csv').map(r => ({
  ncs_id: r.ncs_id,
  ncs_code: r.ncs_code,
  ncs_label: r.ncs_label,
  is_active: bool(r.is_active),
}));
writeJson('color-palettes/ncs.json', ncs);

const pantone = readCsv('TEX_ENUM_PANTONE_C.csv').map(r => ({
  pantone_id: r.pantone_id,
  pantone_code: r.pantone_code,
  pantone_suffix: r.pantone_suffix,
  pantone_label: r.pantone_label,
  is_active: bool(r.is_active),
}));
writeJson('color-palettes/pantone-c.json', pantone);

// ─── Referential Integrity Checks ──────────────────────────────────────────

console.log('\n=== Validazione integrità referenziale ===\n');

const productIds = new Set(prodotti.map(p => p.product_id));
const skuIds = new Set(packagingSku.map(s => s.sku_id));
const listinoSkuIds = new Set(listino.map(l => l.sku_id));
const ruleIdSet = new Set(decisionTable.map(r => r.rule_id));
const stepIds = new Set(stepLibrary.map(s => s.step_id));

let errors = 0;

// Check step_library product_ids exist in prodotti
for (const step of stepLibrary) {
  if (step.product_id && !productIds.has(step.product_id)) {
    console.warn(`  [WARN] step_library '${step.step_id}': product_id '${step.product_id}' non trovato in prodotti`);
  }
}

// Check step_map rule_ids exist in decision_table
const missingRules = new Set<string>();
for (const sm of stepMap) {
  if (!ruleIdSet.has(sm.rule_id)) missingRules.add(sm.rule_id);
}
if (missingRules.size > 0) {
  console.error(`  [ERROR] step_map: rule_ids non trovati in decision_table: ${[...missingRules].join(', ')}`);
  errors++;
}

// Check step_map step_ids exist in step_library
const missingSteps = new Set<string>();
for (const sm of stepMap) {
  if (!stepIds.has(sm.step_id)) missingSteps.add(sm.step_id);
}
if (missingSteps.size > 0) {
  console.error(`  [ERROR] step_map: step_ids non trovati in step_library: ${[...missingSteps].join(', ')}`);
  errors++;
}

// Check packaging SKU ids exist in listino
const packagingNotInListino = packagingSku.filter(p => !listinoSkuIds.has(p.sku_id));
if (packagingNotInListino.length > 0) {
  console.warn(`  [WARN] ${packagingNotInListino.length} SKU in packaging non presenti nel listino:`);
  packagingNotInListino.slice(0, 5).forEach(p => console.warn(`    - ${p.sku_id}`));
}

// Check listino SKU ids exist in packaging
const listinoNotInPackaging = listino.filter(l => !skuIds.has(l.sku_id));
if (listinoNotInPackaging.length > 0) {
  console.warn(`  [WARN] ${listinoNotInPackaging.length} SKU nel listino non presenti in packaging:`);
  listinoNotInPackaging.slice(0, 5).forEach(l => console.warn(`    - ${l.sku_id}`));
}

// Check decision table uniqueness per support_id+env_id combination
const dtKeyCount: Record<string, number> = {};
for (const rule of decisionTable) {
  const key = `${rule.support_id}|${rule.env_id}|${rule.din}|${rule.zona_doccia}|${rule.humidity_band ?? ''}|${rule.cohesion ?? ''}|${rule.cracks ?? ''}|${rule.tile_bedding ?? ''}|${rule.hollow ?? ''}`;
  dtKeyCount[key] = (dtKeyCount[key] ?? 0) + 1;
}
const KNOWN_AMBIGUITIES = new Set(['F_COMP|ORD|0|0|||||']);
const ambiguousKeys = Object.entries(dtKeyCount).filter(([, count]) => count > 1);
const trueAmbiguities = ambiguousKeys.filter(([key]) => !KNOWN_AMBIGUITIES.has(key));
const knownAmbiguities = ambiguousKeys.filter(([key]) => KNOWN_AMBIGUITIES.has(key));
if (knownAmbiguities.length > 0) {
  console.log(`  [INFO] Decision table: ${knownAmbiguities.length} ambiguità note (gestite via sub-domanda wizard):`);
  knownAmbiguities.forEach(([key]) => console.log(`    - ${key} (F_COMP_AS / F_COMP_EP — scelta utente)`));
}
if (trueAmbiguities.length > 0) {
  console.error(`  [ERROR] Decision table: ${trueAmbiguities.length} combinazioni ambigue non gestite:`);
  trueAmbiguities.forEach(([key]) => console.error(`    - ${key}`));
  errors++;
}

if (errors === 0) {
  console.log('  [OK] Nessun errore critico di integrità.');
} else {
  console.error(`\n  [FAIL] ${errors} errore/i critico/i trovati. Correggere i CSV prima di procedere.`);
}

// ─── Meta ──────────────────────────────────────────────────────────────────

const allJsonFiles = fs.readdirSync(OUT_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => fs.readFileSync(path.join(OUT_DIR, f), 'utf-8'))
  .join('');
const hash = crypto.createHash('sha256').update(allJsonFiles).digest('hex').slice(0, 16);

const meta = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  hash,
  csv_source: 'csv-data/',
  files: {
    decision_table_rules: decisionTable.length,
    step_map_entries: stepMap.length,
    step_library_entries: stepLibrary.length,
    prodotti: prodotti.length,
    packaging_sku: packagingSku.length,
    listino_sku: listino.length,
    supporti: supporti.length,
    color_natural_24: natural24.length,
    color_sense_24: sense24.length,
    color_dekora_24: dekora24.length,
    color_ral: ralClassic.length,
    color_ncs: ncs.length,
    color_pantone: pantone.length,
  },
};
writeJson('_meta.json', meta);

console.log('\n=== Conversione completata ===\n');
console.log(`Hash dataset: ${hash}`);
console.log(`Output: ${OUT_DIR}\n`);

if (errors > 0) process.exit(1);
