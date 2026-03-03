# Stato applicazione — Store Zustand

## Architettura store

```
wizard-store   ← stato wizard corrente (un ambiente alla volta)
project-store  ← lista ambienti configurati + carrello aggregato
cart-store     ← PackagedItem[] nel carrello (Step 6)
admin-store    ← override admin (persistiti su localStorage)
auth-store     ← utente autenticato
```

---

## wizard-store (`src/store/wizard-store.ts`)

### Stato
Contiene l'intera `WizardState` (vedi `types/wizard-state.ts`).  
Gestisce la navigazione tra step e la validazione.

### Azioni principali

```typescript
setAmbiente(id, name)
setMqPavimento(mq)
setMqPareti(mq)
setSupportoFloor(id)
setSupportoWall(id)
setSubAnswer(macro, key, value)
setSurface(surface)         // aggiunge/aggiorna una superficie
removeSurface(id)
setTexture(surfaceId, line, style)
setColor(surfaceId, color_primary, color_secondary?)
setProtettivo(sel)
setProtectorMode(mode)
setFinishType(type)
nextStep() / prevStep()
reset()
```

### Navigazione step
`currentStep` va da 1 a 6. `maxReachedStep` impedisce di saltare step non ancora raggiunti.

---

## project-store (`src/store/project-store.ts`)

### Stato

```typescript
interface ProjectState {
  rooms: ProjectRoom[]          // lista ambienti
  cart: ProjectCartRow[]        // carrello aggregato
  strategy: PackagingStrategy   // 'MINIMO_SFRIDO' di default
  cart_built: boolean
  config_log: ConfigLogEntry[]
}
```

### ProjectRoom

```typescript
interface ProjectRoom {
  id: string
  room_type: string
  custom_name: string
  wizard_state: WizardState | null    // stato wizard al momento del completamento
  cart_lines: CartLine[]              // righe CartResult originali
  step_lavorazioni: StepLavorazione[] // procedura per vista applicatore
  computation_errors: { code, text }[]
  created_at: string
  updated_at: string
}
```

### Azioni principali

```typescript
addRoom(room_type, custom_name): string        // ritorna l'id del nuovo ambiente
removeRoom(id)
setRoomResult(id, state, lines, store, result) // salva dati wizard completato → auto buildCart
unconfigureRoom(id)
buildCart(store, strategy?)                    // ricalcola carrello da tutti gli ambienti
setStrategy(s, store)                          // cambia strategia e ricalcola
overrideCartRow(row_id, sku_id, qty_packs, store)
excludeCartRow(row_id) / restoreCartRow(row_id)
removeCartRow(row_id)
addManualRow(sku_id, qty_packs, store)         // → imposta strategy='MANUALE'
reset()
hydrate()                                      // carica da localStorage
isManualMode(): boolean
```

### buildCartFromRooms (logica interna)

```typescript
function buildCartFromRooms(rooms, store, strategy): ProjectCartRow[]
```

1. Per ogni ambiente configurato:  
   - Chiama `computeTechnicalGroups(room.wizard_state, store)`  
   - Aggrega texture per `g.id` (chiave = `texture::line::color::zone`)  
   - Aggrega non-texture per `product_id::section::destination`

2. Chiama `computePackagedItems(texGroups, store, strategy)` per le texture

3. Per non-texture: `computePackagingOptions + bestOption` direttamente

4. Ritorna `ProjectCartRow[]` con `from_rooms[]` per tracciabilità

### Persistenza
Chiave localStorage: `nativus_project`  
`hydrate()` carica e migra la struttura precedente se mancano campi.

---

## cart-store (`src/store/cart-store.ts`)

### Scopo
Contiene i `PackagedItem[]` del Step 6 (wizard corrente, non il progetto).  
Viene sincronizzato dal `useMemo` in `StepCart.tsx`.

### Stato
```typescript
interface CartState {
  items: PackagedItem[]
  setItems(items): void
  clear(): void
}
```

Non è persistito. Viene resettato a ogni apertura wizard.

---

## admin-store (`src/store/admin-store.ts`)

### Scopo
Permette all'admin di modificare i dati statici senza toccare i file JSON.  
Gli override vengono applicati dal `data-loader.ts` al momento del caricamento store.

### Struttura override

```typescript
interface AdminLoaderOverrides {
  stepLibrary: StepDefinition[]
  stepMap: { rule_id, step_order, step_id }[]
  packagingSku: PackagingSku[]
  listino: ListinoSku[]
  ambienti: Ambiente[]
  supporti: SupportoItem[]
  dinInputs: DinInput[]
  dinOrderRules: DinOrderRule[]
  textureLines: TextureLine[]
  textureStyles: TextureStyle[]
  laminePatterns: LaminePattern[]
  commercialNames: Record<string, string>
  colorOverrides: Record<string, { is_active?: boolean; label?: string }>
}
```

### Persistenza
Chiave localStorage: `nativus_admin_overrides`  
Funzione: `useAdminStore.getState().getOverrides()` → passato a `loadDataStore(overrides)`

### Come funziona la propagazione
1. Admin modifica un valore in `AdminProdotti`, `AdminListino`, ecc.
2. `saveSkuEdit()` / `saveStepEdit()` / `saveListinoEdit()` aggiornano lo store admin
3. `invalidateCache()` resetta il singleton DataStore
4. La prossima chiamata a `loadDataStore()` ricarica tutto con gli override applicati
5. I nomi commerciali: `setCommercialNameOverrides(overrides.commercialNames)` → aggiornati nel modulo `product-names.ts`

### Merge strategy in data-loader

| Tipo dato | Merge strategy |
|-----------|---------------|
| Array con `id` | `mergeById(base, overrides, 'id')` — override sostituisce per id |
| `step-map.json` | `mergeStepMap(base, overrides)` — chiave composita `rule_id::step_order` |
| `packagingSku` | `mergeById(base, overrides, 'sku_id')` |
| `listino` | `mergeById(base, overrides, 'sku_id')` |
| `commercialNames` | `{ ...base, ...overrides }` — merge oggetto |
| `colorOverrides` | `applyColorOverrides(palette, overrides)` — muta `is_active`/`label` |

---

## Componenti Admin (`src/components/admin/`)

| Componente | Funzione |
|-----------|---------|
| `AdminRiepilogo.tsx` | Hub principale — card cliccabili per ogni sezione |
| `AdminProdotti.tsx` | Editor inline: nome commerciale, SKU (pezzatura/prezzo), step library (consumi) |
| `AdminListino.tsx` | Editor prezzi per ogni SKU |
| `AdminStratigrafie.tsx` | Visualizzazione step library (sola lettura estesa) |
| `AdminExport.tsx` | Export/import configurazione JSON |

### Flusso modifica nome commerciale
1. Admin clicca su prodotto in `AdminProdotti`
2. Modifica `nomeCommerciale` nel campo input
3. `saveNameEdit()` → `adminStore.setCommercialNameOverride(product_id, name)`
4. Tutti i `getCommercialName(product_id)` chiamate ritornano il nuovo nome
5. Si propaga su: carrello, export PDF, export XLSX, StepCart

### Warning propagazione nomi
Il componente `AdminProdotti` mostra automaticamente quali logiche usano il `product_id` modificato (procedure, packaging, protettivi) per permettere verifica manuale dei consumi.
