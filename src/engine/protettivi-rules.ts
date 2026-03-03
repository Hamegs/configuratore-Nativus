import type { DataStore } from '../utils/data-loader';
import type { TextureLineId, ProtectionSystem } from '../types/enums';
import type { ProtettivoSelection } from '../types/protettivi';
import type { CartLine } from '../types/cart';

export interface ProtettiviCartResult {
  cart_lines: CartLine[];
  step_descriptions: ProtezioneStep[];
  hard_alerts: string[];
}

export interface ProtezioneStep {
  step_order: number;
  name: string;
  product_id: string;
  qty_per_mano: number;
  n_mani: number;
  qty_total_kg: number;
  unit: string;
  diluizione?: string;
  potlife_min?: string;
  t_min_h?: string;
  t_max_h?: string;
  note?: string;
}

function priceOf(store: DataStore, sku_id: string): number {
  return store.listino.find(l => l.sku_id === sku_id)?.prezzo_listino ?? 0;
}

function descOf(store: DataStore, sku_id: string): string {
  return store.packagingSku.find(p => p.sku_id === sku_id)?.descrizione_sku ?? sku_id;
}

function packQty(store: DataStore, sku_id: string, total_kg: number): number {
  const pkg = store.packagingSku.find(p => p.sku_id === sku_id);
  if (!pkg || !pkg.pack_size) return 1;
  return Math.ceil(total_kg / pkg.pack_size);
}

function packSizeOf(store: DataStore, sku_id: string): number {
  return store.packagingSku.find(p => p.sku_id === sku_id)?.pack_size ?? 0;
}

function findOptimalSku(store: DataStore, product_id: string, total_kg: number): { sku_id: string; qty: number; prezzo_unitario: number } {
  const candidates = store.packagingSku.filter(p => p.product_id === product_id && p.pack_size);
  if (candidates.length === 0) return { sku_id: product_id, qty: 1, prezzo_unitario: 0 };

  candidates.sort((a, b) => (b.pack_size ?? 0) - (a.pack_size ?? 0));
  const best = candidates[0];
  const qty = Math.ceil(total_kg / (best.pack_size ?? 1));
  return {
    sku_id: best.sku_id,
    qty,
    prezzo_unitario: priceOf(store, best.sku_id),
  };
}

export function computeProtettiviCart(
  store: DataStore,
  sel: ProtettivoSelection,
  line: TextureLineId,
  area_mq: number,
  uso_superficie: 'PAVIMENTO' | 'PARETE_FUORI_BAGNO' | 'BAGNO_DOCCIA',
  zone_label?: string,
): ProtettiviCartResult {
  const { system, finitura, opaco_colorato } = sel;
  const lines: CartLine[] = [];
  const steps: ProtezioneStep[] = [];
  const alerts: string[] = [];

  const isH2O = system === 'H2O';
  const isFloorOrWet = uso_superficie === 'PAVIMENTO' || uso_superficie === 'BAGNO_DOCCIA';

  let stepOrder = 10;

  function withZone(desc: string): string {
    return zone_label ? `${desc} — ${zone_label}` : desc;
  }

  function colorAndZone(desc: string): string {
    let d = desc;
    if (sel.colore_code) d += ` — ${sel.colore_code}`;
    if (zone_label) d += ` — ${zone_label}`;
    return d;
  }

  // ─── H2O System ────────────────────────────────────────────────────────
  if (isH2O) {
    if (line !== 'LAMINE' && line !== 'CORLITE') {
      const fixConsumption = (line === 'DEKORA' || line === 'MATERIAL') ? 100 : 50;
      const fixKg = (fixConsumption / 1000) * area_mq;
      const fixSku = area_mq <= 2.5 ? 'PROTEGGO_FIX_H2O_1LITRO' : 'PROTEGGO_FIX_H2O_2_5LT';
      const fixQty = packQty(store, fixSku, fixKg);
      lines.push({
        sku_id: fixSku,
        product_id: 'PROTEGGO_FIX_H2O',
        descrizione: withZone(descOf(store, fixSku)),
        qty: fixQty,
        qty_raw: fixKg,
        pack_size: packSizeOf(store, fixSku),
        pack_unit: 'lt',
        prezzo_unitario: priceOf(store, fixSku),
        totale: fixQty * priceOf(store, fixSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'PROTEGGO Fix H2O', product_id: 'PROTEGGO_FIX_H2O', qty_per_mano: fixConsumption, n_mani: 1, qty_total_kg: fixKg, unit: 'g/m²', t_min_h: '0', t_max_h: '—' });
      stepOrder += 10;
    }

    if (line === 'LAMINE') {
      const kgMano1 = (250 / 1000) * area_mq;
      const kgMano2 = (150 / 1000) * area_mq;
      const lucidoSku = area_mq <= 3 ? 'PROTEGGO_LUCIDO_H20_1_35KG' : 'PROTEGGO_LUCIDO_H20_2_4_5KG';
      const lucidoQty = packQty(store, lucidoSku, kgMano1 + kgMano2);
      lines.push({
        sku_id: lucidoSku,
        product_id: 'PROTEGGO_LUCIDO_H2O',
        descrizione: withZone(`${descOf(store, lucidoSku)} — LAMINE base a spatola`),
        qty: lucidoQty,
        qty_raw: kgMano1 + kgMano2,
        pack_size: packSizeOf(store, lucidoSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, lucidoSku),
        totale: lucidoQty * priceOf(store, lucidoSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'LAMINE: PROTEGGO Lucido H2O a spatola (mano 1, 250 g/m²)', product_id: 'PROTEGGO_LUCIDO_H2O', qty_per_mano: 250, n_mani: 1, qty_total_kg: kgMano1, unit: 'g/m²' });
      stepOrder += 10;
      steps.push({ step_order: stepOrder, name: 'LAMINE: PROTEGGO Lucido H2O a spatola (mano 2, 150 g/m²)', product_id: 'PROTEGGO_LUCIDO_H2O', qty_per_mano: 150, n_mani: 1, qty_total_kg: kgMano2, unit: 'g/m²' });
      stepOrder += 10;
      if (finitura === 'OPACO') {
        const opKg = (80 / 1000) * area_mq;
        const opSku = 'PROTEGGO_OPACO_H20_2_5_5KG';
        const opQty = packQty(store, opSku, opKg);
        lines.push({
          sku_id: opSku,
          product_id: 'PROTEGGO_OPACO_H2O',
          descrizione: withZone(descOf(store, opSku)),
          qty: opQty,
          qty_raw: opKg,
          pack_size: packSizeOf(store, opSku),
          pack_unit: 'kg',
          prezzo_unitario: priceOf(store, opSku),
          totale: opQty * priceOf(store, opSku),
          section: 'protettivi',
        });
        steps.push({ step_order: stepOrder, name: 'PROTEGGO Opaco H2O (finitura LAMINE)', product_id: 'PROTEGGO_OPACO_H2O', qty_per_mano: 80, n_mani: 1, qty_total_kg: opKg, unit: 'g/m²' });
      }
      return { cart_lines: lines, step_descriptions: steps, hard_alerts: alerts };
    }

    if (line === 'CORLITE') {
      if (finitura === 'LUCIDO') {
        const waxKg = (30 / 1000) * area_mq * 2;
        const waxSku = 'CRYSTEPO_V_6KG';
        const waxQty = packQty(store, waxSku, waxKg);
        lines.push({
          sku_id: waxSku,
          product_id: 'SEAL_WAX',
          descrizione: withZone('Seal Wax lucida (2 mani, 30 g/m²/mano)'),
          qty: waxQty,
          qty_raw: waxKg,
          pack_size: packSizeOf(store, waxSku),
          pack_unit: 'kg',
          prezzo_unitario: priceOf(store, waxSku),
          totale: waxQty * priceOf(store, waxSku),
          section: 'protettivi',
        });
        steps.push({ step_order: stepOrder, name: 'SEAL WAX lucida — 2 mani (30 g/m² per mano)', product_id: 'SEAL_WAX', qty_per_mano: 30, n_mani: 2, qty_total_kg: waxKg, unit: 'g/m²' });
      } else {
        const opKg = (80 / 1000) * area_mq * 2;
        const opSku = 'PROTEGGO_OPACO_H20_2_5_5KG';
        const opQty = packQty(store, opSku, opKg);
        lines.push({
          sku_id: opSku,
          product_id: 'PROTEGGO_OPACO_H2O',
          descrizione: withZone(descOf(store, opSku)),
          qty: opQty,
          qty_raw: opKg,
          pack_size: packSizeOf(store, opSku),
          pack_unit: 'kg',
          prezzo_unitario: priceOf(store, opSku),
          totale: opQty * priceOf(store, opSku),
          section: 'protettivi',
        });
        steps.push({ step_order: stepOrder, name: 'PROTEGGO Opaco H2O — 2 mani (80 g/m²/mano)', product_id: 'PROTEGGO_OPACO_H2O', qty_per_mano: 80, n_mani: 2, qty_total_kg: opKg, unit: 'g/m²' });
      }
      return { cart_lines: lines, step_descriptions: steps, hard_alerts: alerts };
    }

    if (opaco_colorato && finitura === 'PROTEGGO_COLOR_OPACO') {
      const kg3mani = (100 / 1000) * area_mq * 3;
      const colorSkuSmall = 'PROTEGGO_COLOR_OPACO_H20_COLORE_NATURAL_0_9KG';
      const colorSkuLarge = 'PROTEGGO_COLOR_OPACO_H20_COLORE_NATURAL_2_4_5KG';
      const colorSku = area_mq <= 9 ? colorSkuSmall : colorSkuLarge;
      const packSizeColor = area_mq <= 9 ? 0.9 : 4.5;
      const colorQty = Math.ceil(kg3mani / packSizeColor);
      lines.push({
        sku_id: colorSku,
        product_id: 'PROTEGGO_COLOR_OPACO_H2O',
        descrizione: colorAndZone('PROTEGGO COLOR'),
        qty: colorQty,
        qty_raw: kg3mani,
        pack_size: packSizeColor,
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, colorSku),
        totale: colorQty * priceOf(store, colorSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'PROTEGGO Color Opaco H2O — 3 mani (100 g/m²/mano, dil. 9%/5%/5%)', product_id: 'PROTEGGO_COLOR_OPACO_H2O', qty_per_mano: 100, n_mani: 3, qty_total_kg: kg3mani, unit: 'g/m²', diluizione: '9% / 5% / 5%' });
      stepOrder += 10;
      const transparentSku = sel.trasparente_finale === 'LUCIDO_H2O' ? 'PROTEGGO_LUCIDO_H20_2_4_5KG' : 'PROTEGGO_OPACO_H20_2_5_5KG';
      const transProductId = sel.trasparente_finale === 'LUCIDO_H2O' ? 'PROTEGGO_LUCIDO_H2O' : 'PROTEGGO_OPACO_H2O';
      const transKg = (80 / 1000) * area_mq;
      const transQty = packQty(store, transparentSku, transKg);
      lines.push({
        sku_id: transparentSku,
        product_id: transProductId,
        descrizione: withZone(`${descOf(store, transparentSku)} (mano finale trasparente obbligatoria)`),
        qty: transQty,
        qty_raw: transKg,
        pack_size: packSizeOf(store, transparentSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, transparentSku),
        totale: transQty * priceOf(store, transparentSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'Mano trasparente finale obbligatoria (opaco o lucido)', product_id: 'PROTEGGO_TRASPARENTE_FINALE', qty_per_mano: 80, n_mani: 1, qty_total_kg: transKg, unit: 'g/m²' });
      alerts.push('PROTEGGO Color Opaco H2O: obbligatorio 1 mano di trasparente finale (opaco o lucido).');
      return { cart_lines: lines, step_descriptions: steps, hard_alerts: alerts };
    }

    if (finitura === 'OPACO') {
      const nMani = isFloorOrWet ? 3 : (uso_superficie === 'PARETE_FUORI_BAGNO' ? 2 : 3);
      const kgTot = (80 / 1000) * area_mq * nMani;
      const opSku = area_mq <= 6 ? 'PROTEGGO_OPACO_H20_1_1KG' : 'PROTEGGO_OPACO_H20_2_5_5KG';
      const opQty = packQty(store, opSku, kgTot);
      lines.push({
        sku_id: opSku,
        product_id: 'PROTEGGO_OPACO_H2O',
        descrizione: withZone(descOf(store, opSku)),
        qty: opQty,
        qty_raw: kgTot,
        pack_size: packSizeOf(store, opSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, opSku),
        totale: opQty * priceOf(store, opSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: `PROTEGGO Opaco H2O — ${nMani} mani (80 g/m²/mano, non diluire)`, product_id: 'PROTEGGO_OPACO_H2O', qty_per_mano: 80, n_mani: nMani, qty_total_kg: kgTot, unit: 'g/m²', diluizione: 'non diluire', t_max_h: '24' });
      alerts.push('PROTEGGO Opaco H2O: max 24 h tra le mani; oltre → carteggio 150/180.');
    }

    if (finitura === 'LUCIDO') {
      const kgTot = (50 / 1000) * area_mq * 3;
      const lucSku = area_mq <= 3 ? 'PROTEGGO_LUCIDO_H20_1_35KG' : 'PROTEGGO_LUCIDO_H20_2_4_5KG';
      const lucQty = packQty(store, lucSku, kgTot);
      lines.push({
        sku_id: lucSku,
        product_id: 'PROTEGGO_LUCIDO_H2O',
        descrizione: withZone(descOf(store, lucSku)),
        qty: lucQty,
        qty_raw: kgTot,
        pack_size: packSizeOf(store, lucSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, lucSku),
        totale: lucQty * priceOf(store, lucSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'PROTEGGO Lucido H2O — 3 mani (50 g/m²/mano prod. puro, dil. 50%/30%/30%)', product_id: 'PROTEGGO_LUCIDO_H2O', qty_per_mano: 50, n_mani: 3, qty_total_kg: kgTot, unit: 'g/m²', diluizione: '50% / 30% / 30%', t_min_h: '4', t_max_h: '24' });
      alerts.push('PROTEGGO Lucido H2O: max 24 h tra le mani; oltre → carteggio 150/180.');
    }
  }

  // ─── Solvente System ────────────────────────────────────────────────────
  if (!isH2O) {
    if (line === 'MATERIAL') {
      alerts.push('MATERIAL non disponibile con sistema a solvente. Usare H2O.');
      return { cart_lines: [], step_descriptions: [], hard_alerts: alerts };
    }

    if (line !== 'LAMINE' && line !== 'CORLITE') {
      const fixS = (line === 'DEKORA') ? 80 : 60;
      const fixKg = (fixS / 1000) * area_mq;
      const fixSku = area_mq <= 5 ? 'PROTEGGO_FIX_S_1_1KG' : 'PROTEGGO_FIX_S_2_4_95KG';
      const fixQty = packQty(store, fixSku, fixKg);
      lines.push({
        sku_id: fixSku,
        product_id: 'PROTEGGO_FIX_S',
        descrizione: withZone(descOf(store, fixSku)),
        qty: fixQty,
        qty_raw: fixKg,
        pack_size: packSizeOf(store, fixSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, fixSku),
        totale: fixQty * priceOf(store, fixSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: `PROTEGGO Fix S (${fixS} g/m²)`, product_id: 'PROTEGGO_FIX_S', qty_per_mano: fixS, n_mani: 1, qty_total_kg: fixKg, unit: 'g/m²' });
      stepOrder += 10;
    }

    if (line === 'LAMINE') {
      const kgMano1 = (250 / 1000) * area_mq;
      const kgMano2 = (150 / 1000) * area_mq;
      const lucSku = 'PROTEGGO_LUCIDO_S_4_5KG';
      const lucQty = packQty(store, lucSku, kgMano1 + kgMano2);
      lines.push({
        sku_id: lucSku,
        product_id: 'PROTEGGO_LUCIDO_S',
        descrizione: withZone(`${descOf(store, lucSku)} — LAMINE base a spatola`),
        qty: lucQty,
        qty_raw: kgMano1 + kgMano2,
        pack_size: packSizeOf(store, lucSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, lucSku),
        totale: lucQty * priceOf(store, lucSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'LAMINE: Lucido S a spatola (mano 1: 250 g/m², mano 2: 150 g/m²)', product_id: 'PROTEGGO_LUCIDO_S', qty_per_mano: 250, n_mani: 2, qty_total_kg: kgMano1 + kgMano2, unit: 'g/m²' });
      stepOrder += 10;
      if (finitura === 'OPACO') {
        const opKg = (80 / 1000) * area_mq;
        const opSku = 'PROTEGGO_OPACO_S_2_6KG';
        const opQty = packQty(store, opSku, opKg);
        lines.push({
          sku_id: opSku,
          product_id: 'PROTEGGO_OPACO_S',
          descrizione: withZone(descOf(store, opSku)),
          qty: opQty,
          qty_raw: opKg,
          pack_size: packSizeOf(store, opSku),
          pack_unit: 'kg',
          prezzo_unitario: priceOf(store, opSku),
          totale: opQty * priceOf(store, opSku),
          section: 'protettivi',
        });
        steps.push({ step_order: stepOrder, name: 'PROTEGGO Opaco S (finitura LAMINE, 1 mano)', product_id: 'PROTEGGO_OPACO_S', qty_per_mano: 80, n_mani: 1, qty_total_kg: opKg, unit: 'g/m²' });
      }
      return { cart_lines: lines, step_descriptions: steps, hard_alerts: alerts };
    }

    if (line === 'CORLITE') {
      const opKg = (80 / 1000) * area_mq * 2;
      const opSku = 'PROTEGGO_OPACO_S_2_6KG';
      const opQty = packQty(store, opSku, opKg);
      lines.push({
        sku_id: opSku,
        product_id: 'PROTEGGO_OPACO_S',
        descrizione: withZone(descOf(store, opSku)),
        qty: opQty,
        qty_raw: opKg,
        pack_size: packSizeOf(store, opSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, opSku),
        totale: opQty * priceOf(store, opSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'CORLITE: PROTEGGO Opaco S — 2 mani (80 g/m²/mano)', product_id: 'PROTEGGO_OPACO_S', qty_per_mano: 80, n_mani: 2, qty_total_kg: opKg, unit: 'g/m²' });
      return { cart_lines: lines, step_descriptions: steps, hard_alerts: alerts };
    }

    if (opaco_colorato) {
      const opKg = (80 / 1000) * area_mq * 2;
      const opSku = 'PROTEGGO_OPACO_S_2_6KG';
      const opQty = packQty(store, opSku, opKg);
      lines.push({
        sku_id: opSku,
        product_id: 'PROTEGGO_OPACO_S',
        descrizione: withZone(descOf(store, opSku)),
        qty: opQty,
        qty_raw: opKg,
        pack_size: packSizeOf(store, opSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, opSku),
        totale: opQty * priceOf(store, opSku),
        section: 'protettivi',
      });
      const premixSku = 'PREMIX_COLORE_OPACO_S_1_88_0_14KG';
      lines.push({
        sku_id: premixSku,
        product_id: 'PREMIX_COLORE_OPACO_S',
        descrizione: withZone('Premix colore Opaco S (1 per confezione)'),
        qty: opQty,
        qty_raw: opKg,
        pack_size: packSizeOf(store, premixSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, premixSku),
        totale: opQty * priceOf(store, premixSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'PROTEGGO Opaco S colorato — 2 mani + premix (80 g/m²/mano)', product_id: 'PROTEGGO_OPACO_S', qty_per_mano: 80, n_mani: 2, qty_total_kg: opKg, unit: 'g/m²' });
      alerts.push('Opaco S colorato: 1 premix per ogni confezione di Opaco S — gestito nel carrello.');
      return { cart_lines: lines, step_descriptions: steps, hard_alerts: alerts };
    }

    if (finitura === 'OPACO') {
      const kgTot = (80 / 1000) * area_mq * 2;
      const opSku = 'PROTEGGO_OPACO_S_2_6KG';
      const opQty = packQty(store, opSku, kgTot);
      lines.push({
        sku_id: opSku,
        product_id: 'PROTEGGO_OPACO_S',
        descrizione: withZone(descOf(store, opSku)),
        qty: opQty,
        qty_raw: kgTot,
        pack_size: packSizeOf(store, opSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, opSku),
        totale: opQty * priceOf(store, opSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'PROTEGGO Opaco S — 2 mani (80 g/m²/mano)', product_id: 'PROTEGGO_OPACO_S', qty_per_mano: 80, n_mani: 2, qty_total_kg: kgTot, unit: 'g/m²' });
    }

    if (finitura === 'LUCIDO') {
      const kgTot = (80 / 1000) * area_mq * 2;
      const lucSku = 'PROTEGGO_LUCIDO_S_4_5KG';
      const lucQty = packQty(store, lucSku, kgTot);
      lines.push({
        sku_id: lucSku,
        product_id: 'PROTEGGO_LUCIDO_S',
        descrizione: withZone(descOf(store, lucSku)),
        qty: lucQty,
        qty_raw: kgTot,
        pack_size: packSizeOf(store, lucSku),
        pack_unit: 'kg',
        prezzo_unitario: priceOf(store, lucSku),
        totale: lucQty * priceOf(store, lucSku),
        section: 'protettivi',
      });
      steps.push({ step_order: stepOrder, name: 'PROTEGGO Lucido S — 2 mani (80 g/m²/mano)', product_id: 'PROTEGGO_LUCIDO_S', qty_per_mano: 80, n_mani: 2, qty_total_kg: kgTot, unit: 'g/m²' });
    }
  }

  return { cart_lines: lines, step_descriptions: steps, hard_alerts: alerts };
}
