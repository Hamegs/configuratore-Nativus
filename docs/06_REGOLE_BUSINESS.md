# Regole di business — Casi speciali e vincoli

## Regole ambiente effettivo

```
effectiveAmbiente(state) → AmbienteId
```

| Configurazione | Ambiente effettivo |
|---------------|-------------------|
| ambiente=ORD, presenza_doccia=false | ORD |
| ambiente=ORD, presenza_doccia=true | DOC |
| ambiente=BAG, presenza_doccia=false | BAG |
| ambiente=BAG, presenza_doccia=true | DOC |
| ambiente=DOC | DOC |
| ambiente=DIN | DIN |

**Impatto:** L'ambiente effettivo determina `uso_superficie` per i protettivi e il match nella decision table.

---

## Regole supporto composito (F_COMP, F_PAR_RM)

### F_COMP (pavimento composito: piastrella + composito)
- Sottoquestione: `tile_bedding: 'AS' | 'EP'`
- `AS` = adesivo/sigillante → rule diversa da `EP` (epossidico)
- `resolveCompRule(table, env, 'AS')` / `resolveCompRule(table, env, 'EP')`

### F_PAR_RM (parquet su rimozione massetto)
- Sottoquestione: `parquet_comp: 'AS' | 'EP'`
- `resolveCompRule(table, env, 'EP', 'PAR')`

---

## Regole tracce piastrella

### F_TILE_TRACES (piastrella con tracce su pavimento)
- Parametri: `mq_tracce`, `spessore_mm_tracce`
- Formula massetto epossidico: `kg = (mq × spessore_mm) / 1000 × 1800`
- Aggiunto come step con `step_order = -20` (prima di tutto)

### W_TILE_TRACES (tracce su parete)
- `tracce_riempimento = 'RAS_FONDO_FINO'` → kg = mq × spessore × 1.6
- `tracce_riempimento = 'MALTA_ANTIRITIRO'` → nota tecnica (fornitore esterno)
- + Primer SW 150 g/m² per primerizzazione tracce

---

## Upgrade Rasante 2K

Se la procedura include `S_RAS_2K_1_5`, l'utente può scegliere un upgrade:

| Opzione | Sostituisce | Con |
|---------|------------|-----|
| `KEEP` | nessuna sostituzione | — |
| `RAS_BASE` | S_RAS_2K_1_5 | S_RAS_BASE_1_35 |
| `RAS_BASE_Q` | S_RAS_2K_1_5 | S_RAS_BQ_2_0 |

Implementato con `buildStepOverrides(state)` in `cart-calculator.ts`.

---

## Regole pavimento doccia (piatto)

### `buildDocciaPiattoLines`
- Solo se `doccia_piatto_type = 'NUOVO'`
- Prodotti: membrana impermeabilizzante (mq doccia = larghezza × lunghezza)
- Aggiunta alla sezione `speciale`

---

## Texture: gestione fughe residue

In `StepTexture`, la domanda "fughe residue" (`fughe_residue`) può essere:
- `'STANDARD'` — nessun trattamento extra
- `'CRITICHE'` — per SENSE: aggiunge un passaggio fondo extra

Questo si riflette nell'input texture:
```typescript
textureInput.fughe_residue = surface.sub_answers.fughe_residue
```

---

## Texture: colori e bicolore

### COLORABILE
- Aggiunge righe COLORE_FONDO, COLORE_FINITURA, COLORE_KIT
- Colore viene dalla `color_primary.label` (es. 'Cachemire N1')

### CUSTOM_PRECOLORED
- NO righe colore
- Aggiunge una `fee` da 100€ per ogni colore distinto:
  ```
  n_colors = set(color_primary, color_secondary).size
  fee = { description: 'Personalizzazione colore', amount: 100, qty: n_colors }
  ```

### BICOLORE alert (NATURAL con ALIZEE_EVIDENCE_4)
- Hard alert: "È vietato carteggiare tra la prima e la seconda finitura"
- Non blocca il calcolo, solo avviso

---

## Protettivi: numero mani per uso superficie

| uso_superficie | Sistema | Finitura | N° mani |
|---------------|---------|---------|---------|
| PAVIMENTO | H2O | OPACO | 3 |
| PAVIMENTO | H2O | LUCIDO | 3 |
| PARETE_FUORI_BAGNO | H2O | OPACO | 2 |
| PARETE_FUORI_BAGNO | H2O | LUCIDO | 3 |
| BAGNO_DOCCIA | H2O | qualsiasi | 3 |
| PAVIMENTO | S | OPACO | 2 |
| PAVIMENTO | S | LUCIDO | 2 |

---

## Aggregazione texture nel carrello

**Regola**: texture con stessa linea + stesso colore su superfici diverse (pavimento + pareti) vengono AGGREGATE in un'unica riga nel carrello.

**Implementazione** in `services/packaging.ts::computePackagedItems`:
```typescript
// Chiave aggregazione
const key = `${lineId}::${group.color_label ?? ''}`
// → NATURAL::Cachemire N1 (stessa chiave per floor e wall)
// Risultato: aree sommate, zone_label rimosso dalla descrizione
```

**In `cart-calculator.ts::consolidateLines`**:
```typescript
// Per texture: strip zona dalla descrizione prima di usarla come chiave
const displayDesc = section === 'texture' ? stripZoneLabel(desc) : desc
```

**Eccezioni**: 
- Texture con colori DIVERSI non si aggregano
- In `protector_mode='COLOR'`: i protettivi restano per zona (colori diversi per ogni zona)

---

## Gestione errori di calcolo

Gli errori non-critici vengono raccolti e mostrati come alert senza bloccare il carrello:

```typescript
// In computeFullCart
try {
  procedure_floor = resolveStepsForRule(...)
} catch (err) {
  if (err instanceof DataError) {
    computation_errors.push({ code: err.code, text: err.message })
    // continua l'esecuzione
  } else {
    throw err  // errori non previsti: rilancia
  }
}
```

`DataError` è tipizzato con `code` stringa e `details` oggetto per il debugging.

### Codici errori principali

| Code | Causa |
|------|-------|
| `CART_INCOMPLETE_STATE` | Wizard incompleto (manca ambiente, texture o protettivo) |
| `NO_MATCHING_RULE` | Nessuna regola in decision-table per la combinazione scelta |
| `NO_STEPS_FOR_RULE` | rule_id trovato ma nessuno step in step-map |
| `STEP_NOT_IN_LIBRARY` | step_id referenziato non esiste in step-library |
| `INVALID_PACK_SIZE` | SKU con pack_size = 0 o null |
| `NO_SKU_FOR_PRODUCT` | (legacy) prodotto senza SKU in packaging-sku |

---

## Nomi commerciali e override

```typescript
// src/utils/product-names.ts
getCommercialName(product_id: string): string | null
// 1. Cerca in _runtimeOverrides (admin)
// 2. Poi in COMMERCIAL_NAMES (statico)
// 3. Se non trovato → null (il chiamante usa la descrizione SKU come fallback)

setCommercialNameOverrides(overrides: Record<string, string>): void
// Chiamato da admin-store al caricamento
```

### Nomi commerciali ufficiali (estratto)

| product_id | Nome commerciale |
|-----------|----------------|
| RAS_BASE | Rasante Base |
| RAS_BASE_Q | Rasante Base Quarzo |
| RAS_2K | Rasante 2K |
| PR_SW | Primer SW |
| RETE_160 | Rete di vetro 160 g/mq |
| PROTEGGO_FIX_H2O | PROTEGGO FIX H2O |
| PROTEGGO_OPACO_H20 | PROTEGGO OPACO H2O |
| PROTEGGO_LUCIDO_H20 | PROTEGGO LUCIDO H2O |
| PROTEGGO_COLOR | PROTEGGO COLOR |

---

## Formattazione prezzi

```typescript
// src/utils/format.ts
formatEur(value: number): string
// Output: "1.250,00 €"  (separatore migliaia = '.', decimali = ',')
```

Utilizzato ovunque nel carrello. Unica funzione centralizzata.
