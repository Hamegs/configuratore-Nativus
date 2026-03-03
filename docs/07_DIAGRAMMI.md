# Diagramma di flusso — App completa

## Flusso wizard singolo ambiente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WIZARD (singolo ambiente)                          │
│                                                                               │
│  Step 1: Ambiente                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Input: tipo ambiente (ORD/BAG/DOC/DIN), mq pavimento, mq pareti    │    │
│  │  Store: wizard-store.setAmbiente(), setMqPavimento(), setMqPareti()  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                    ▼                                          │
│  Step 2: Supporto                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Input: tipo supporto floor + wall, risposte sottodomande            │    │
│  │  Engine: matchDecisionTable() → rule_id salvato in WizardState       │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                    ▼                                          │
│  Step 3: Texture                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Input: linea texture, stile, colore per ogni Surface                │    │
│  │  State: surfaces[] (FLOOR + WALL_PART)                               │    │
│  │  Opzioni: texture uguale o divisa per pavimento/parete               │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                    ▼                                          │
│  Step 4: Protettivi                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Input: sistema (H2O/S), finitura (OPACO/LUCIDO), mode              │    │
│  │  ProtettivoSelection salvato in WizardState.protettivo               │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                    ▼                                          │
│  Step 5: Riepilogo Tecnico (StepReview)                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Chiama: computeTechnicalSchedule(store, state)                      │    │
│  │  Mostra: sezioni Preparazione / Texture / Protettivo                 │    │
│  │  NO prezzi / NO confezioni                                           │    │
│  │  Pulsante: "Vai al Carrello"                                         │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                    ▼                                          │
│  Step 6: Carrello (StepCart)                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  useEffect:                                                          │    │
│  │    computeTechnicalGroups(state, store) → groups                     │    │
│  │    computeFullCart(store, state) → cartResult                        │    │
│  │                                                                      │    │
│  │  useMemo (dipende da [groups, strategy]):                            │    │
│  │    computePackagedItems(groups, store, strategy) → PackagedItem[]   │    │
│  │                                                                      │    │
│  │  Display:                                                            │    │
│  │    Tabella per sezione (fondo/texture/protettivi/din)                │    │
│  │    Selezione strategia: MINIMO_SFRIDO/ECONOMICO/GRANDI/MANUALE      │    │
│  │    Totale € finale                                                   │    │
│  │                                                                      │    │
│  │  onComplete(cartResult, strategy) → project-store.setRoomResult()   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Flusso multi-ambiente (ProjectPage)

```
ProjectPage
  │
  ├── addRoom() → nuovo ProjectRoom con id
  │
  ├── → RoomWizardPage (wizard embedded)
  │      │
  │      └── onComplete(cartResult, strategy)
  │             │
  │             └── project-store.setRoomResult(id, state, lines, store, result)
  │                   → buildCart(store) automatico
  │
  └── ProjectCartView
        │
        └── buildCart(store) chiama buildCartFromRooms()
              │
              ├── per ogni room: computeTechnicalGroups()
              ├── aggrega texture + non-texture
              └── computePackagedItems() → ProjectCartRow[]
                    │
                    └── display tabella aggregata multi-ambiente
```

---

## Flusso engine di calcolo (dettaglio)

```
computeFullCart(store, state)
│
├── [Guard] stato incompleto? → DataError('CART_INCOMPLETE_STATE')
│
├── computeTracceLines()          ← F_TILE_TRACES / W_TILE_TRACES
│
├── [if mq_pavimento > 0]
│   └── resolveStepsForRule(FLOOR)
│         ├── matchDecisionTable() → rule_id
│         ├── step-map.json filtered by rule_id
│         └── step-library.json per ogni step
│               └── computeQtyTotal(qty, unit, area) → CartLine[]
│
├── [if mq_pareti > 0]
│   └── resolveStepsForRule(WALL)   (stessa logica)
│
├── [for each Surface]
│   └── computeTextureCart(store, { line, area_mq, color_primary, zone_label })
│         ├── computePackaging10Plus2(area) → { n10, n2 }
│         ├── findTexSku(store, lineId, component, mode, pack_size_mq)
│         └── addLine(store, lines, sku_id, qty) → CartLine[]
│
├── [if protettivo]
│   └── computeProtettiviCart(store, sel, line, area_total, uso_sup)
│         ├── PROTEGGO_FIX + PROTEGGO_OPACO/LUCIDO/COLOR
│         └── CartLine[] con qty_raw impostato
│
├── [if DIN]
│   └── computeDinCart(store, din_inputs) → CartLine[]
│
├── consolidateLines(all_lines)
│     └── aggrega per sku_id + descrizione (senza zona per texture)
│
└── return CartResult { summary, procedure_*, computation_errors }
```

---

## Flusso packaging (dettaglio)

```
computePackagedItems(groups, store, mode)
│
├── TEXTURE:
│   ├── per ogni group { section='texture', _textureInput }
│   │     key = lineId :: color_label
│   ├── aggrega totalArea (somma mq stesso colore)
│   ├── computeTextureCart({ ...baseInput, area_mq: totalArea, zone_label: undefined })
│   ├── [se CONFEZIONI_GRANDI]
│   │     maxPack = max(texturePackagingSku[lineId].pack_size_mq)
│   │     adjustedArea = ceil(total/maxPack) × maxPack
│   │     recomputed = computeTextureCart(area=adjustedArea)
│   │     filteredLines = recomputed.filter(l => l.pack_size >= maxPack)
│   └── → PackagedItem[] (destination=null, no zona)
│
└── NON-TEXTURE (fondo, protettivi, din):
    ├── per ogni group { section != 'texture' }
    │     key = product_id :: section :: destination
    ├── aggrega qty_raw
    ├── [skip se qty_raw <= 0 o no SKU match]
    ├── computePackagingOptions(qty_raw, matchedSkus, listino)
    │     → PackagingOption[] { qty_packs, sfrido, totale }
    ├── bestOption(options, mode)
    └── → PackagedItem[]
```

---

## Admin override pipeline

```
AdminProdotti / AdminListino / AdminRiepilogo
  │
  ├── modifica valore (nome, prezzo, pezzatura, consumo)
  │
  └── adminStore.save*()
        │
        └── localStorage['nativus_admin_overrides'] aggiornato
              │
              └── invalidateCache()
                    │
                    └── prossima loadDataStore()
                          │
                          ├── legge JSON statici
                          ├── legge override da localStorage
                          ├── mergeById() / mergeStepMap()
                          └── setCommercialNameOverrides()
                                │
                                └── getCommercialName() ritorna override
```
