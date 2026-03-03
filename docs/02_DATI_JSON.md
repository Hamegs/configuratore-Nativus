# Dati statici JSON — Struttura e ruolo

Tutti i file JSON si trovano in `src/data/static/`.  
Vengono caricati all'avvio da `data-loader.ts` e uniti agli eventuali override dell'admin.

---

## Mappa completa dei file JSON

| File | Usato da | Scopo |
|------|---------|-------|
| `ambienti.json` | StepAmbiente, decision-table | Lista tipi ambiente (ORD, BAG, DOC, DIN) |
| `supporti.json` | StepSupporto, decision-table | Lista tipi supporto per macro (FLOOR/WALL) |
| `decision-table.json` | engine/decision-table.ts | Regole match (ambiente+supporto+risposte) → rule_id |
| `step-map.json` | engine/step-resolver.ts | Associa rule_id + step_order → step_id |
| `step-library.json` | engine/step-resolver.ts | Dettaglio di ogni step (product_id, qty, unit, tempi) |
| `step-types.json` | (display) | Nomi delle tipologie di step |
| `packaging-sku.json` | services/packaging.ts | SKU commerciali (confezioni) per prodotti NON-texture |
| `listino.json` | services/packaging.ts, packaging-optimizer | Prezzi per ogni sku_id |
| `texture-packaging-sku.json` | engine/texture-rules.ts | SKU confezioni per prodotti texture (10mq, 2mq kit) |
| `texture-lines.json` | StepTexture | Lista linee texture (NATURAL, SENSE, DEKORA…) |
| `texture-styles.json` | StepTexture | Stili per ogni linea texture |
| `lamine-patterns.json` | StepTexture | Pattern per la linea LAMINE |
| `protettivi-h2o.json` | StepProtettivi | Opzioni protettivi sistema H2O |
| `protettivi-s.json` | StepProtettivi | Opzioni protettivi sistema S (solvente) |
| `din-inputs.json` | StepDin | Parametri accessori doccia (sistema DIN) |
| `din-order-rules.json` | engine/din-calculator.ts | Regole calcolo accessori doccia |
| `inputs-extra-h2o.json` | engine/protettivi-rules.ts | Consumi extra prodotti H2O |
| `inputs-extra-s.json` | engine/protettivi-rules.ts | Consumi extra prodotti S |
| `tex-op-params.json` | engine/texture-rules.ts | Parametri operativi texture (diluizioni, pot life) |
| `texture-order-rules.json` | engine/texture-rules.ts | Ordine componenti nella procedura texture |
| `prodotti.json` | admin, display | Catalogo prodotti (anagrafica) |
| `macros.json` | (display) | Nomi macro FLOOR/WALL |
| `color-palettes/*.json` | StepTexture | Palette colori (NATURAL-24, SENSE-24, DEKORA-24, RAL, NCS, Pantone) |
| `color-palettes-meta.json` | data-loader | Metadati palette (quale palette per quale linea) |
| `color-standards.json` | (display) | Standard colore supportati |
| `_meta.json` | (versioning) | Versione dati |

---

## Schema: packaging-sku.json

```json
{
  "sku_id": "RAS_BASE_Q_14_56KG",
  "product_id": "RAS_BASE_Q",
  "descrizione_sku": "Rasante Base Quarzo 14,56 kg",
  "pack_size": 14.56,
  "pack_unit": "kg"
}
```

**Regola:** `product_id` deve corrispondere esattamente al `product_id` usato in `step-library.json` e `protettivi-rules.ts`.

---

## Schema: texture-packaging-sku.json

```json
{
  "sku_id": "NAT_FONDO_10",
  "line_id": "NATURAL",
  "component": "FONDO",
  "mode": "COLORABILE",
  "pack_size_mq": 10,
  "param": "color",
  "product_id": "FONDO_NATURAL_COLORABILE_10M2"
}
```

**Componenti texture validi:** `FONDO`, `FINITURA`, `KIT`, `COLORE_FONDO`, `COLORE_FINITURA`, `COLORE_KIT`  
**Modi:** `COLORABILE`, `CUSTOM_PRECOLORED`, `NEUTRO`, `PATTERN`, `CUSTOM_FEE0`

---

## Schema: step-library.json

```json
{
  "step_id": "S_RAS_BQ_2_0",
  "name": "Rasante Base Quarzo 2,0 mm",
  "product_id": "RAS_BASE_Q",
  "step_type_id": "REPR",
  "qty": 1500,
  "unit": "g/m²",
  "note": null
}
```

---

## Schema: step-map.json

```json
{
  "rule_id": "F_TILE_BAGNO",
  "step_order": 10,
  "step_id": "S_PRIM_SW"
}
```

Ogni `rule_id` ha una sequenza di step ordinati per `step_order`.

---

## Schema: decision-table.json

```json
{
  "rule_id": "F_TILE_BAGNO",
  "ambiente": "BAG",
  "macro": "FLOOR",
  "supporto_id": "F_TILE",
  "sfarinante": null,
  "crepe": null,
  "hollow": "SI",
  "humidity_band": null,
  "cohesion": null,
  "tile_bedding": null
}
```

Il match avviene per ogni campo non-null: se il campo `sub_answers` corrisponde → rule trovata.

---

## Schema: listino.json

```json
{
  "sku_id": "RAS_BASE_Q_14_56KG",
  "prezzo_listino": 259.90
}
```

Un `sku_id` non presente in listino vale 0€ (nessun errore, solo prezzo 0).

---

## Schema: protettivi-h2o.json

```json
{
  "system": "H2O",
  "finitura": "OPACO",
  "uso_superficie": "PAVIMENTO",
  "product_fix": "PROTEGGO_FIX_H2O",
  "product_top": "PROTEGGO_OPACO_H20",
  "n_mani": 3,
  "consumo_g_m2": 80
}
```
