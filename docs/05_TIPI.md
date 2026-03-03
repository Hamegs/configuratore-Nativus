# Tipi TypeScript — Interfacce chiave

## WizardState (`src/types/wizard-state.ts`)

```typescript
interface SubAnswers {
  sfarinante?: boolean
  crepe?: boolean
  crepe_ml?: number
  humidity_band?: string
  cohesion?: string | boolean
  tile_bedding?: string
  hollow?: string
  piatto_doccia?: string
  fughe_residue?: string
  parquet_comp?: 'AS' | 'EP'
  mq_tracce?: number | null
  spessore_mm_tracce?: number | null
  tracce_riempimento?: 'RAS_FONDO_FINO' | 'MALTA_ANTIRITIRO' | null
}

interface Surface {
  id: string
  type: 'FLOOR' | 'WALL_PART'
  mq: number
  texture_line: TextureLineId | null
  texture_style: TextureStyleId | null
  color_mode: ColorMode | null
  color_primary: ColorSelection | null
  color_secondary: ColorSelection | null
  lamine_pattern: string | null
  protector_color: ColorSelection | null
}

interface WizardState {
  // Step 1 - Ambiente
  ambiente: AmbienteId | null
  room_type_display: string | null
  mercato: Mercato                       // 'IT' | 'DIN'
  mq_pavimento: number
  mq_pareti: number
  superfici_confirmed: boolean
  presenza_doccia: boolean
  mercato_tedesco: boolean
  doccia_larghezza: number
  doccia_lunghezza: number
  doccia_altezza_rivestimento: number
  doccia_piatto_type: 'NUOVO' | 'ESISTENTE' | null
  doccia_raccordi_standard: number
  doccia_raccordi_grandi: number
  doccia_bbcorner_in: number
  doccia_bbcorner_out: number
  doccia_bbtape_ml: number
  doccia_norphen_ml: number
  doccia_nicchie: boolean
  doccia_n_raccordi: number

  // Step 2 - Supporto
  supporto_floor: string | null
  supporto_wall: string | null
  sub_answers_floor: SubAnswers
  sub_answers_wall: SubAnswers

  // Step 3 - Texture (modello multi-superficie)
  surfaces: Surface[]
  walls_differentiated: boolean
  texture_line: TextureLineId | null     // backward compat
  texture_style: TextureStyleId | null   // backward compat
  color_mode: ColorMode | null           // backward compat
  color_primary: ColorSelection | null   // backward compat
  color_secondary: ColorSelection | null // backward compat
  lamine_pattern: string | null          // backward compat

  // Step 4 - Protettivi
  protettivo: ProtettivoSelection | null
  protector_mode: 'TRASPARENTE' | 'COLOR'
  finish_type: 'OPACO' | 'LUCIDO'

  // Upgrade rasante
  ras2k_upgrade: 'KEEP' | 'RAS_BASE' | 'RAS_BASE_Q'

  // DIN
  din_inputs: DinInputValues | null

  // Navigazione
  currentStep: number
  maxReachedStep: number
  active_blocks: BlockingError[]
  rule_id_floor: string | null
  rule_id_wall: string | null
  resolved_steps_floor: StepDefinition[]
  resolved_steps_wall: StepDefinition[]
}
```

---

## Enums (`src/types/enums.ts`)

```typescript
type AmbienteId     = 'ORD' | 'BAG' | 'DOC' | 'DIN'
type TextureLineId  = 'NATURAL' | 'SENSE' | 'DEKORA' | 'LAMINE' | 'CORLITE' | 'MATERIAL'
type TextureStyleId = 'CHROMO' | 'ALIZEE_EVIDENCE_4' | 'COR_CHROMO' | 'COR_EVIDENCE'
type ProtectionSystem = 'H2O' | 'S'
type Mercato        = 'IT' | 'DIN'
type ColorMode      = 'COLORABILE' | 'CUSTOM_PRECOLORED' | 'PATTERN' | 'NEUTRO' | 'CUSTOM_FEE0'
```

---

## CartLine (`src/types/cart.ts`)

```typescript
interface CartLine {
  sku_id: string           // SKU commerciale (es. 'FONDO_NATURAL_COLORABILE_10M2')
  descrizione: string      // nome visualizzato (es. 'NATURAL Fondo — Cachemire N1')
  qty: number              // numero confezioni
  prezzo_unitario: number
  totale: number
  product_id?: string      // es. 'RAS_BASE_Q'
  section: 'fondo' | 'texture' | 'protettivi' | 'din' | 'speciale'
  note?: string
  qty_raw?: number         // quantità fisica (kg o mq) — usata da technical.ts
  pack_size?: number
  pack_unit?: string       // 'kg', 'lt', 'mq'
}

interface CartSummary {
  lines: CartLine[]
  fees: CartFee[]
  hard_notes: CartHardNote[]
  total_eur: number
  total_lines_eur: number
  total_fees_eur: number
  generated_at: string
}

interface CartResult {
  summary: CartSummary
  procedure_floor: ResolvedProcedure | null
  procedure_wall: ResolvedProcedure | null
  procedure_texture: CartProcedureStep[]
  procedure_protettivi: CartProcedureStep[]
  computation_errors: { code: string; text: string }[]
}
```

---

## TechnicalGroup / PackagedItem (`src/types/services.ts`)

```typescript
// Layer tecnico — quantità fisiche, nessuna confezione
interface TechnicalGroup {
  id: string
  product_id: string
  nomeCommerciale: string
  description: string
  section: ServiceSection
  destination: string | null    // 'Pavimento', 'Parete 1', ecc. o null
  texture_line?: string
  color_label?: string
  qty_raw: number               // es. 42.0 (mq) o 10.08 (kg)
  unit: string                  // 'mq' | 'kg' | 'lt'
}

// Layer commerciale — confezioni pronte per il carrello
interface PackagedItem {
  row_id: string                // UUID generato
  product_id: string
  sku_id: string
  nomeCommerciale: string
  description: string
  destination: string | null
  section: ServiceSection
  qty_packs: number             // es. 5
  pack_size: number             // es. 10 (mq) o 5.5 (kg)
  pack_unit: string
  prezzo_unitario: number
  totale: number
  from_rooms?: string[]
  status: 'active' | 'excluded'
  source: 'auto' | 'manual'
}
```

---

## ProtettivoSelection (`src/types/protettivi.ts`)

```typescript
interface ProtettivoSelection {
  system: 'H2O' | 'S'
  finitura: 'OPACO' | 'LUCIDO' | 'PROTEGGO_COLOR_OPACO'
  uso_superficie: 'PAVIMENTO' | 'PARETE_FUORI_BAGNO' | 'BAGNO_DOCCIA'
  opaco_colorato?: boolean
  colore_source?: string
  colore_code?: string
  trasparente_finale?: boolean
}
```

---

## PackagingStrategy (`src/types/project.ts`)

```typescript
type PackagingStrategy = 'MINIMO_SFRIDO' | 'ECONOMICO' | 'CONFEZIONI_GRANDI' | 'MANUALE'
```

---

## DataStore (`src/utils/data-loader.ts`)

```typescript
interface DataStore {
  ambienti: Ambiente[]
  supporti: SupportoItem[]
  decisionTable: DecisionTableRow[]
  stepMap: { rule_id, step_order, step_id }[]
  stepLibrary: StepDefinition[]
  packagingSku: PackagingSku[]
  listino: ListinoSku[]
  texturePackagingSku: TexturePackagingSku[]
  textureLines: TextureLine[]
  textureStyles: TextureStyle[]
  laminePatterns: LaminePattern[]
  colorPalettes: Record<string, ColorEntry[]>
  dinInputs: DinInput[]
  dinOrderRules: DinOrderRule[]
  protettiviH2o: ProtettivoConfig[]
  protettiviS: ProtettivoConfig[]
  prodotti: Prodotto[]
  stepTypes: StepType[]
  inputsExtraH2o: InputExtra[]
  inputsExtraS: InputExtra[]
  texOpParams: TexOpParam[]
  textureOrderRules: TextureOrderRule[]
  macros: Macro[]
  commercialNameOverrides: Record<string, string>
}
```
