# Logiche di calcolo — Engine

## 1. Decision Table (`src/engine/decision-table.ts`)

### Scopo
Dato lo stato del wizard (ambiente + tipo supporto + risposte sottodomande), restituisce il `rule_id` da usare per risolvere la procedura di preparazione supporto.

### Funzioni

```typescript
// Costruisce l'oggetto di input per il match dalla WizardState
buildRuleInputFromWizard(state, macro: 'FLOOR' | 'WALL'): RuleInput | null

// Match principale: cerca la prima riga che soddisfa tutti i campi non-null
matchDecisionTable(table: DecisionTableRow[], input: RuleInput): { rule_id: string }

// Per supporti compositi (F_COMP, F_PAR_RM): risolve la regola base
resolveCompRule(table, env, comp_type: 'AS'|'EP', variant?: 'PAR'): { rule_id: string }
```

### Logica di match
- Ogni campo `null` in `decision-table.json` = wildcard (match sempre)
- Se nessuna riga soddisfa → lancia `DataError('NO_MATCHING_RULE')`
- Gestione speciale: `F_COMP` (pavimento composito) usa `resolveCompRule` con `tile_bedding: 'AS'|'EP'`

---

## 2. Step Resolver (`src/engine/step-resolver.ts`)

### Scopo
Dato un `rule_id` e un'area in m², costruisce la procedura completa di preparazione supporto.

### Funzione principale

```typescript
resolveStepsForRule(
  store: DataStore,
  ruleId: string,
  macro: 'FLOOR' | 'WALL',
  area_mq: number,
  stepOverrides?: Partial<Record<string, string>>
): ResolvedProcedure
```

### Flusso
1. Filtra `step-map.json` per `rule_id`, ordina per `step_order`
2. Se vuoto → lancia `DataError('NO_STEPS_FOR_RULE')`
3. Per ogni step:  
   a. Applica `stepOverrides` (es. sostituisce `S_RAS_2K_1_5` con `S_RAS_BQ_2_0` se l'utente sceglie upgrade)  
   b. Cerca step in `step-library.json` → lancia `DataError('STEP_NOT_IN_LIBRARY')` se mancante  
   c. Calcola `qty_total = computeQtyTotal(qty, unit, area_mq)`  
   d. Arricchisce con tempi di lavorazione (`enrichStepWithTimings`)

### Conversione quantità

```
g/m²  → kg:   qty × area / 1000
kg/m² → kg:   qty × area
m²    → m²:   area (rete, mesh)
pz    → pz:   qty × area
```

---

## 3. Texture Rules (`src/engine/texture-rules.ts`)

### Scopo
Dato un input di texture (linea, stile, area, colore), genera le `CartLine[]` con confezioni e prezzi per tutti i componenti.

### Funzione principale

```typescript
computeTextureCart(store: DataStore, input: TextureInput): TextureConsumption
// TextureConsumption: { cart_lines, hard_alerts, fees, pre_texture_kg }
```

### Input

```typescript
interface TextureInput {
  line: TextureLineId        // 'NATURAL' | 'SENSE' | 'DEKORA' | 'LAMINE' | 'CORLITE' | 'MATERIAL'
  style: TextureStyleId | null
  area_mq: number
  macro: 'FLOOR' | 'WALL'
  color_mode: string | null
  color_primary: ColorSelection | null
  color_secondary: ColorSelection | null
  lamine_pattern: string | null
  last_base_layer: string     // influisce sui consumi pre-texture
  zone_label?: string         // se presente → appeso alla descrizione ("— Pavimento")
}
```

### Logica per linea

| Linea | Packaging | Componenti | Note |
|-------|-----------|-----------|------|
| **NATURAL** | 10mq + kit 2mq | FONDO, FINITURA, KIT + 3 COLORE_ | BICOLORE alert se style=ALIZEE_EVIDENCE_4 |
| **SENSE** | 10mq + kit 2mq | FONDO, FINITURA, KIT + 3 COLORE_ | Extra fondo se fughe_residue=CRITICHE |
| **DEKORA** | 10mq + kit 2mq | FONDO, FINITURA, KIT + 3 COLORE_ | Come NATURAL |
| **LAMINE** | 10mq + kit 2mq | FONDO, FINITURA, KIT + COLORE_ | Gestione pattern PATTERN |
| **CORLITE** | 4mq + 1mq | Prodotti specifici CORLITE | Style COR_CHROMO / COR_EVIDENCE |
| **MATERIAL** | Specifico | Prodotti MATERIAL | Mode NEUTRO |

### Packaging texture

```typescript
computePackaging10Plus2(area_mq): { n10, n2 }
// n10 = floor(area / 10)
// n2  = ceil(resto / 2)   se resto > 0

computePackaging4Plus1(area_mq): { n4, n1 }
// n4 = floor(area / 4)
// n1 = ceil(resto / 1)    se resto > 0
```

### Descrizione riga

La funzione interna `d(phase)` costruisce la descrizione:
```
"{LINEA} {fase}"
  + " — {colore}"       se color_primary impostato
  + " — {zone_label}"   se zone_label impostato
```

Esempio: `"NATURAL Fondo — Cachemire N1"` (senza zona se non specificata)

### Colore mode

| ColorMode | Comportamento |
|-----------|--------------|
| `COLORABILE` | Aggiunge righe COLORE_FONDO, COLORE_FINITURA, COLORE_KIT |
| `CUSTOM_PRECOLORED` | NO righe colore; aggiunge fee 100€ per ogni colore diverso |
| `PATTERN` | Solo per LAMINE |
| `NEUTRO` | Solo per MATERIAL |
| `CUSTOM_FEE0` | Solo per CORLITE |

---

## 4. Protettivi Rules (`src/engine/protettivi-rules.ts`)

### Scopo
Calcola le righe CartLine e la descrizione della procedura protettiva per un'area.

### Funzione principale

```typescript
computeProtettiviCart(
  store: DataStore,
  sel: ProtettivoSelection,
  line: TextureLineId,
  area_mq: number,
  uso_superficie: 'PAVIMENTO' | 'PARETE_FUORI_BAGNO' | 'BAGNO_DOCCIA',
  zone_label?: string,   // aggiunto alla descrizione se presente
): ProtettiviCartResult
```

### Sistema H2O

**PROTEGGO FIX H2O** (sempre presente, tranne LAMINE/CORLITE):
- `50 g/m²` standard
- `100 g/m²` per DEKORA e MATERIAL

**Percorso OPACO (standard):**
- 3 mani per PAVIMENTO/BAGNO_DOCCIA, 2 mani per PARETE
- `80 g/m²/mano` → `PROTEGGO_OPACO_H20`

**Percorso LUCIDO:**
- 3 mani, `50 g/m²/mano` → `PROTEGGO_LUCIDO_H20`
- Diluizioni: 50% / 30% / 30%

**Percorso COLOR (PROTEGGO_COLOR):**
- 3 mani, `100 g/m²/mano`
- Diluizioni: 9% / 5% / 5%
- Aggiunge coat trasparente finale (`PROTEGGO_OPACO_H20` o `PROTEGGO_LUCIDO_H20`)

**Percorso LAMINE:**
- Doppio strato: `PROTEGGO_LUCIDO_H20` (250 + 150 g/m²)
- Opzionale: `PROTEGGO_OPACO_H20`

**Percorso CORLITE:**
- LUCIDO → `CRYSTEPO_V` 2 × 30 g/m²
- OPACO → `PROTEGGO_OPACO_H20` 2 × 80 g/m²

### Sistema S (solvente)

Stessa struttura logica di H2O ma con prodotti diversi:

| Prodotto H2O | Prodotto S |
|-------------|-----------|
| PROTEGGO_FIX_H2O | PROTEGGO_FIX_S |
| PROTEGGO_OPACO_H20 | PROTEGGO_OPACO_S |
| PROTEGGO_LUCIDO_H20 | PROTEGGO_LUCIDO_S |
| PROTEGGO_COLOR | PROTEGGO_OPACO_S + PREMIX_COLORE_OPACO_S |

**MATERIAL con sistema S:** hard alert, non supportato.

---

## 5. Packaging Optimizer (`src/engine/packaging-optimizer.ts`)

### Scopo
Data una quantità raw e le SKU disponibili, calcola le opzioni di packaging e sceglie la migliore in base alla strategia.

### Funzioni

```typescript
computePackagingOptions(qty_raw, skus, listino): PackagingOption[]
// Per ogni SKU: qty_packs = ceil(qty_raw / pack_size), sfrido = qty_packs×pack_size - qty_raw

bestOption(options, strategy): PackagingOption | null
// MINIMO_SFRIDO:     ordina per sfrido ASC, poi totale ASC
// ECONOMICO:         ordina per totale ASC
// CONFEZIONI_GRANDI: ordina per pack_size DESC
// MANUALE:           stesso di MINIMO_SFRIDO
```

### Esempio

```
qty_raw = 10.08 kg, SKU: [1.1kg, 5.5kg]

Opzione 1.1kg:  qty_packs = ceil(10.08/1.1) = 10,  sfrido = 10×1.1 - 10.08 = 0.92
Opzione 5.5kg:  qty_packs = ceil(10.08/5.5) = 2,   sfrido = 2×5.5  - 10.08 = 0.92

MINIMO_SFRIDO → stesso sfrido → vince quella col totale minore (5.5kg se prezzo/kg uguale)
CONFEZIONI_GRANDI → vince 5.5kg (pack_size maggiore)
ECONOMICO → dipende dai prezzi
```

---

## 6. DIN Calculator (`src/engine/din-calculator.ts`)

### Scopo
Calcola accessori per doccia (sistema DIN): bande impermeabili, raccordi, norphen, tape, ecc.

### Funzione

```typescript
computeDinCart(store, inputs: DinInputValues): { cart_lines, hard_alerts }
buildDinInputsFromWizard(state): DinInputValues
```

I parametri (misure doccia, numero raccordi, nicchie, ecc.) derivano dalla `WizardState`.

---

## 7. Effective Ambiente (`src/engine/effective-ambiente.ts`)

```typescript
effectiveAmbiente(state: WizardState): 'ORD' | 'BAG' | 'DOC' | 'DIN'
isEffectiveShower(state): boolean
```

In presenza di doccia (anche in ambiente ORD o BAG), l'ambiente effettivo diventa `DOC` o `DIN` per le regole di calcolo supporto e protettivo.
