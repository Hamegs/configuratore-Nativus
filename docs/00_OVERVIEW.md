# Nativus Configuratore — Panoramica Tecnica

## Cos'è questa applicazione

Configuratore web per rivenditori e applicatori di rivestimenti decorativi Nativus.  
L'utente percorre un wizard a 6 step, al termine del quale il sistema genera:
- un **riepilogo tecnico** (Step 5) con materiali e quantità reali
- un **carrello commerciale** (Step 6) con confezioni, prezzi e totale ordine
- **export PDF/XLSX** del preventivo

Il sistema supporta la gestione di **ambienti multipli** (es. più bagni o stanze) all'interno di un unico progetto.

---

## Stack tecnologico

| Livello | Tecnologia |
|---------|-----------|
| Framework UI | React 18 + Vite |
| Styling | Tailwind CSS |
| Tipizzazione | TypeScript (strict) |
| State management | Zustand (wizard-store, project-store, cart-store, admin-store) |
| Dati statici | JSON nella cartella `src/data/static/` |
| Export | jsPDF, SheetJS (xlsx) |
| Auth | auth-store (ProtectedRoute) |

---

## Struttura cartelle

```
src/
├── components/
│   ├── admin/          ← pannello amministratore (editor inline)
│   ├── layout/         ← AppShell, Navbar, CartDrawer
│   ├── project/        ← ProjectCartView (carrello multi-ambiente)
│   ├── views/          ← OrderResultPage, VistaApplicatore, VistaRivenditore
│   └── wizard/         ← 6 Step del wizard + WizardContainer
│
├── data/static/        ← tutti i file JSON di configurazione
│
├── engine/             ← LOGICA DI CALCOLO PURA (nessuna UI)
│   ├── cart-calculator.ts       ← calcola CartResult completo
│   ├── decision-table.ts        ← match regola supporto → rule_id
│   ├── texture-rules.ts         ← calcola righe texture per area
│   ├── protettivi-rules.ts      ← calcola righe protettivo per area
│   ├── step-resolver.ts         ← risolve procedura fondo per rule_id
│   ├── packaging-optimizer.ts   ← sceglie confezioni ottimali
│   ├── din-calculator.ts        ← accessori doccia sistema DIN
│   └── errors.ts                ← DataError tipizzato
│
├── services/
│   ├── technical.ts    ← computeTechnicalGroups (layer tecnico puro)
│   ├── packaging.ts    ← computePackagedItems (layer commerciale)
│   └── export.ts       ← funzioni di export
│
├── store/
│   ├── wizard-store.ts   ← stato del wizard (WizardState)
│   ├── project-store.ts  ← lista ambienti + carrello aggregato
│   ├── cart-store.ts     ← items correnti nel carrello (Step 6)
│   └── admin-store.ts    ← override admin persistiti su localStorage
│
├── types/              ← tutte le interfacce TypeScript
└── utils/
    ├── data-loader.ts   ← carica + merge JSON (con override admin)
    ├── product-names.ts ← mappa product_id → nome commerciale
    └── export-pdf/xlsx  ← generatori documenti
```

---

## Pipeline dati: dall'input al carrello

```
[WizardState]
     │
     ▼
computeFullCart()          ← engine/cart-calculator.ts
  │  (CartResult + procedure floor/wall/texture/protettivi)
  │
  ├──► computeTechnicalGroups()   ← services/technical.ts
  │       (TechnicalGroupEnriched[] — quantità raw, nessuna confezione)
  │
  └──► computePackagedItems()     ← services/packaging.ts
          (PackagedItem[] — confezioni, prezzi, totale)
               │
               ▼
           StepCart / ProjectCartView
```

**Regola fondamentale:**  
- `engine/` non sa nulla di confezioni né prezzi  
- `services/technical.ts` non sa nulla di confezioni  
- `services/packaging.ts` è l'UNICO layer che legge `packaging-sku.json` e `listino.json`

---

## I 6 Step del wizard

| Step | File | Scopo |
|------|------|-------|
| 1 – Ambiente | `StepAmbiente.tsx` | Scelta tipo ambiente (ORD/BAG/DOC/DIN) e mq |
| 2 – Supporto | `StepSupporto.tsx` | Tipo supporto esistente (piastrella, rasante, ecc.) |
| 3 – Texture | `StepTexture.tsx` | Scelta linea texture, stile, colore per pavimento/pareti |
| 4 – Protettivo | `StepProtettivi.tsx` | Sistema H2O o S, finitura opaco/lucido |
| 5 – Riepilogo tecnico | `StepReview.tsx` | Scaletta prodotti + quantità (NO prezzi, NO confezioni) |
| 6 – Carrello | `StepCart.tsx` | Confezioni + prezzi + totale + strategia packaging |
