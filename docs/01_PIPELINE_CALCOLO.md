# Pipeline di calcolo — Flusso completo

## Fase 1: Raccolta input (WizardState)

Il `WizardState` (definito in `src/types/wizard-state.ts`) è l'oggetto centrale che lo wizard accumula step per step.

### Campi principali

```typescript
interface WizardState {
  ambiente: 'ORD' | 'BAG' | 'DOC' | 'DIN' | null
  mq_pavimento: number
  mq_pareti: number
  supporto_floor: string | null        // es. 'F_TILE', 'F_SCREED'
  supporto_wall:  string | null        // es. 'W_TILE', 'W_PLASTER'
  sub_answers_floor: SubAnswers        // risposte domande aggiuntive supporto
  sub_answers_wall:  SubAnswers
  surfaces: Surface[]                  // modello multi-superficie
  texture_line: TextureLineId | null   // backward compat (singola texture)
  protettivo: ProtettivoSelection | null
  protector_mode: 'TRASPARENTE' | 'COLOR'
  finish_type: 'OPACO' | 'LUCIDO'
}
```

### Modello multi-superficie (Surface[])

Ogni elemento di `surfaces` rappresenta pavimento o una parete:

```typescript
interface Surface {
  id: string
  type: 'FLOOR' | 'WALL_PART'
  mq: number
  texture_line: TextureLineId | null
  texture_style: TextureStyleId | null
  color_mode: ColorMode | null
  color_primary: ColorSelection | null    // colore scelto
  color_secondary: ColorSelection | null  // 2° colore per bicolore
  lamine_pattern: string | null
  protector_color: ColorSelection | null  // solo se protector_mode='COLOR'
}
```

---

## Fase 2: Calcolo procedura supporto (decision-table → step-resolver)

### File: `src/engine/decision-table.ts`

Legge `decision-table.json` e fa match tra `(ambiente, supporto, sub_answers)` → `rule_id`.

```typescript
matchDecisionTable(table, input)  → { rule_id: string }
resolveCompRule(table, env, comp_type, variant?) → { rule_id: string }  // per F_COMP
buildRuleInputFromWizard(state, 'FLOOR'|'WALL')  → RuleInput | null
```

### File: `src/engine/step-resolver.ts`

Dato un `rule_id`, legge `step-map.json` + `step-library.json` e costruisce la procedura:

```typescript
resolveStepsForRule(store, ruleId, 'FLOOR'|'WALL', area_mq, overrides?)
  → ResolvedProcedure { rule_id, macro, steps: StepDefinition[] }
```

Ogni `StepDefinition` ha:
- `product_id` — prodotto da applicare
- `qty_total` — quantità totale calcolata (kg o m²)
- `qty`, `unit` — consumo unitario (es. `1500 g/m²`)
- Tempi di attesa/lavorazione (arricchiti da `time-sanding-enricher.ts`)

### Conversione unità in step-resolver

| Unità | Formula |
|-------|---------|
| `g/m²` | `(qty × area_mq) / 1000` → kg |
| `kg/m²` | `qty × area_mq` |
| `m²` | `area_mq` (rete/mesh: identità) |
| `pz/unit` | `qty × area_mq` (area_mq = conteggio pezzi) |

---

## Fase 3: Calcolo carrello completo (cart-calculator)

### File: `src/engine/cart-calculator.ts`

Funzione principale:

```typescript
computeFullCart(store: DataStore, state: WizardState): CartResult
```

**Guardia iniziale:**  
Lancia `DataError('CART_INCOMPLETE_STATE')` se mancano `ambiente`, `protettivo`, o nessuna superficie ha texture configurata.

**Ordine di esecuzione interno:**

1. **Tracce piastrella** (`buildDocciaPiattoLines`, `computeTracceLines`)  
   Riempimento tracce/binari su piastrella (massetto epossidico, rasante fondo fino)

2. **Procedura pavimento** (`resolveStepsForRule` con macro=`FLOOR`)  
   Genera `CartLine[]` per Primer SW, Rete, Rasante Base, ecc.  
   Errori → aggiunti a `computation_errors`, non bloccano l'esecuzione

3. **Procedura pareti** (`resolveStepsForRule` con macro=`WALL`)  
   Come pavimento ma per le pareti

4. **Texture** per ogni `Surface` → `computeTextureCart(store, { ...surface, zone_label })`  
   Genera `CartLine[]` con confezioni 10mq + kit 2mq + righe colore

5. **Protettivi** → `computeProtettiviCart()`  
   - `protector_mode='COLOR'`: calcola per ogni superficie separatamente  
   - `protector_mode='TRASPARENTE'`: calcola una volta per area totale

6. **DIN** (accessori doccia) → `computeDinCart()`

7. **Massetto doccia** → `buildDocciaPiattoLines()`

8. **consolidateLines()** — aggrega righe con stesso `sku_id + descrizione`  
   Per texture: usa descrizione senza zona (pavimento/parete strip) → le righe si sommano

**Output (`CartResult`):**

```typescript
interface CartResult {
  summary: CartSummary              // lines[], fees[], totali, hard_notes
  procedure_floor: ResolvedProcedure | null
  procedure_wall:  ResolvedProcedure | null
  procedure_texture: CartProcedureStep[]
  procedure_protettivi: CartProcedureStep[]
  computation_errors: { code, text }[]
}
```

---

## Fase 4: Layer tecnico (computeTechnicalGroups)

### File: `src/services/technical.ts`

```typescript
computeTechnicalGroups(state: WizardState, store: DataStore): TechnicalGroupEnriched[]
```

**Cosa fa:**
1. Chiama `computeFullCart()` internamente per ottenere linee fondo/protettivi
2. Itera `result.summary.lines` e **SALTA** le righe `section='texture'`
3. Per ogni riga non-texture → crea un `TechnicalGroupEnriched` con `qty_raw` reale (kg o lt)
4. Per ogni `Surface` in `state.surfaces` → chiama `buildTextureGroup()` che crea un gruppo texture con `_textureInput` (input grezzo, senza SKU)

**Output per ogni gruppo:**

```typescript
interface TechnicalGroupEnriched extends TechnicalGroup {
  _textureInput?: TextureInput    // input grezzo per computeTextureCart
}
// TechnicalGroup:
{
  id: string                     // es. 'texture::NATURAL::Cachemire N1::Pavimento'
  product_id: string
  description: string            // es. 'NATURAL — Cachemire N1 — Pavimento'
  section: ServiceSection        // 'fondo'|'texture'|'protettivi'|...
  destination: string | null     // 'Pavimento', 'Parete 1', ecc.
  texture_line?: string          // es. 'NATURAL'
  color_label?: string           // es. 'Cachemire N1'
  qty_raw: number                // quantità reale (mq per texture, kg per altri)
  unit: string                   // 'mq' o 'kg' o 'lt'
}
```

**Perché separiamo tecnico da commerciale?**  
Il layer tecnico NON sa nulla di confezioni. Restituisce quantità fisiche (es. 42 mq di NATURAL Cachemire N1) che il packaging layer trasforma in confezioni.

---

## Fase 5: Layer packaging (computePackagedItems)

### File: `src/services/packaging.ts`

```typescript
computePackagedItems(
  groups: TechnicalGroupEnriched[],
  store: DataStore,
  mode: PackagingStrategy,
  fromRooms?: string[],
): PackagedItem[]
```

**Strategia packaging (`PackagingStrategy`):**

| Valore | Comportamento |
|--------|--------------|
| `MINIMO_SFRIDO` | Minimizza l'eccedenza (spreco) tra le confezioni disponibili |
| `ECONOMICO` | Minimizza il costo totale |
| `CONFEZIONI_GRANDI` | Usa solo la confezione più grande disponibile |
| `MANUALE` | Stessa logica di MINIMO_SFRIDO ma flag manuale |

**Flusso per le TEXTURE:**

```
groups (texture) 
  → aggrega per chiave  lineId::color_label
  → somma tutti i mq (pavimento + pareti con stesso colore)
  → chiama computeTextureCart(store, { ...baseInput, area_mq: totale, zone_label: undefined })
  → genera CartLine[] senza etichette zona
  → se CONFEZIONI_GRANDI: filtra solo pack_size >= max, ricalcola qty
  → ogni CartLine → PackagedItem
```

**Flusso per i NON-TEXTURE (fondo, protettivi, ecc.):**

```
groups (non-texture)
  → aggrega per chiave  product_id::section::destination
  → somma qty_raw
  → filtra packagingSku dove product_id match e pack_size > 0
  → computePackagingOptions() → bestOption(mode) → PackagedItem
```

**Output (`PackagedItem`):**

```typescript
interface PackagedItem {
  row_id: string
  product_id: string
  sku_id: string
  nomeCommerciale: string      // da getCommercialName() + override admin
  description: string          // descrizione prodotto con colore
  destination: string | null   // zona (solo per PROTEGGO COLOR)
  section: ServiceSection
  qty_packs: number            // numero confezioni
  pack_size: number
  pack_unit: string            // 'kg', 'lt', 'mq'
  prezzo_unitario: number
  totale: number
  from_rooms?: string[]        // da quali ambienti proviene
  status: 'active' | 'excluded'
  source: 'auto' | 'manual'
}
```

---

## Fase 6: Aggregazione multi-ambiente (project-store)

### File: `src/store/project-store.ts`

Quando il wizard è completato, `onComplete(cartResult, strategy)` chiama `setRoomResult()` che salva:
- `wizard_state` dell'ambiente configurato
- `cart_lines` (CartLine[] da computeFullCart)
- `step_lavorazioni` (procedura tecnica per la vista applicatore)

**Quando si accede a `ProjectCartView`**, `buildCart(store)` chiama internamente `buildCartFromRooms()`:

```
per ogni ambiente configurato
  → computeTechnicalGroups(room.wizard_state, store)
  → aggrega gruppi texture per id (line+color+zone key)
  → aggrega gruppi non-texture per product_id::section::destination
  → computePackagedItems() → PackagedItem[]
  → ProjectCartRow[]
```

`ProjectCartRow` è la struttura finale del carrello con `qty_packs` editabile dall'utente.

---

## Fase 7: Export

### File: `src/utils/export-pdf.ts` e `src/utils/export-xlsx.ts`

Due export separati:

| Export | Fonte dati | Contenuto |
|--------|-----------|-----------|
| **Commerciale** (PDF/XLSX) | `PackagedItem[]` dal carrello | Confezioni, prezzi, totale |
| **Tecnico** (PDF) | `TechnicalGroup[]` + `procedure_*` | Procedure applicative, quantità kg |
