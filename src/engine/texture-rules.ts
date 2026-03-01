import type { DataStore } from '../utils/data-loader';
import type { TextureLineId, TextureStyleId, ProtectionSystem } from '../types/enums';
import type { ColorSelection } from '../types/texture';
import type { CartLine } from '../types/cart';
import { DataError } from './errors';

export interface TextureInput {
  line: TextureLineId;
  style: TextureStyleId;
  area_mq: number;
  macro: 'FLOOR' | 'WALL';
  color_mode: string;
  color_primary: ColorSelection | null;
  color_secondary: ColorSelection | null;
  lamine_pattern: string | null;
  last_base_layer: 'RAS_BASE' | 'RAS_BASE_Q' | 'BARR_VAP_4' | 'FONDO_BASE' | string;
  fughe_residue?: string;
  env_id: string;
}

export interface TextureConsumption {
  pre_texture_kg: number;
  pre_texture_sku_id: string | null;
  cart_lines: CartLine[];
  hard_alerts: string[];
  fees: Array<{ description: string; amount: number; qty: number }>;
}

function getPreTextureConsumption(lastBaseLayer: string): number {
  if (lastBaseLayer === 'BARR_VAP_4') return 0;
  if (lastBaseLayer === 'RAS_BASE_Q') return 0.80;
  return 0.60;
}

function computePackaging10Plus2(area_mq: number): { n10: number; n2: number } {
  const n10 = Math.floor(area_mq / 10);
  const remainder = area_mq - n10 * 10;
  const n2 = remainder > 0 ? Math.ceil(remainder / 2) : 0;
  return { n10, n2 };
}

function computePackaging4Plus1(area_mq: number): { n4: number; n1: number } {
  const n4 = Math.floor(area_mq / 4);
  const remainder = area_mq - n4 * 4;
  const n1 = remainder > 0 ? Math.ceil(remainder / 1) : 0;
  return { n4, n1 };
}

function findTexSku(
  store: DataStore,
  line_id: string,
  component: string,
  mode: string,
): string | null {
  const entry = store.texturePackagingSku.find(
    t => t.line_id === line_id && t.component === component && t.mode === mode,
  );
  return entry?.sku_id ?? null;
}

function priceOf(store: DataStore, sku_id: string): number {
  return store.listino.find(l => l.sku_id === sku_id)?.prezzo_listino ?? 0;
}

function descOf(store: DataStore, sku_id: string): string {
  return store.packagingSku.find(p => p.sku_id === sku_id)?.descrizione_sku ?? sku_id;
}

export function computeTextureCart(
  store: DataStore,
  input: TextureInput,
): TextureConsumption {
  const { line, style, area_mq, color_mode } = input;
  const alerts: string[] = [];
  const lines: CartLine[] = [];
  const fees: Array<{ description: string; amount: number; qty: number }> = [];

  if (area_mq <= 0) return { pre_texture_kg: 0, pre_texture_sku_id: null, cart_lines: [], hard_alerts: [], fees: [] };

  const preQty = getPreTextureConsumption(input.last_base_layer);

  // ─── NATURAL ──────────────────────────────────────────────────────────────
  if (line === 'NATURAL') {
    const isBicolor = style === 'ALIZEE_EVIDENCE_4';
    const isColorabile = color_mode === 'COLORABILE';
    const isCustomFee = color_mode === 'CUSTOM_PRECOLORED';
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    const modeKey = isColorabile ? 'COLORABILE' : 'PRECOLORED';
    const styleKey = isBicolor ? 'ALIZEE_EVIDENCE' : 'CHROMO';

    const skuFondo10 = findTexSku(store, 'NATURAL', `FONDO_${styleKey}`, `${modeKey}_10MQ`);
    const skuFinitura10 = findTexSku(store, 'NATURAL', `FINITURA_${styleKey}`, `${modeKey}_10MQ`);
    const skuKit2 = findTexSku(store, 'NATURAL', `KIT_${styleKey}`, `${modeKey}_2MQ`);

    if (n10 > 0 && skuFondo10) {
      lines.push({ sku_id: skuFondo10, descrizione: descOf(store, skuFondo10), qty: n10, prezzo_unitario: priceOf(store, skuFondo10), totale: n10 * priceOf(store, skuFondo10), section: 'texture' });
    }
    if (n10 > 0 && skuFinitura10) {
      lines.push({ sku_id: skuFinitura10, descrizione: descOf(store, skuFinitura10), qty: n10, prezzo_unitario: priceOf(store, skuFinitura10), totale: n10 * priceOf(store, skuFinitura10), section: 'texture' });
    }
    if (n2 > 0 && skuKit2) {
      lines.push({ sku_id: skuKit2, descrizione: descOf(store, skuKit2), qty: n2, prezzo_unitario: priceOf(store, skuKit2), totale: n2 * priceOf(store, skuKit2), section: 'texture' });
    }

    if (isColorabile) {
      const skuColor10f = findTexSku(store, 'NATURAL', `COLORE_FONDO_${styleKey}`, 'COLORABILE_10MQ');
      const skuColor10fi = findTexSku(store, 'NATURAL', `COLORE_FINITURA_${styleKey}`, 'COLORABILE_10MQ');
      const skuColorKit2 = findTexSku(store, 'NATURAL', `COLORE_KIT_${styleKey}`, 'COLORABILE_2MQ');
      if (n10 > 0 && skuColor10f) lines.push({ sku_id: skuColor10f, descrizione: descOf(store, skuColor10f), qty: n10, prezzo_unitario: priceOf(store, skuColor10f), totale: n10 * priceOf(store, skuColor10f), section: 'texture' });
      if (n10 > 0 && skuColor10fi) lines.push({ sku_id: skuColor10fi, descrizione: descOf(store, skuColor10fi), qty: n10, prezzo_unitario: priceOf(store, skuColor10fi), totale: n10 * priceOf(store, skuColor10fi), section: 'texture' });
      if (n2 > 0 && skuColorKit2) lines.push({ sku_id: skuColorKit2, descrizione: descOf(store, skuColorKit2), qty: n2, prezzo_unitario: priceOf(store, skuColorKit2), totale: n2 * priceOf(store, skuColorKit2), section: 'texture' });
    }

    if (isCustomFee) {
      const numColors = isBicolor ? 2 : 1;
      fees.push({ description: `Personalizzazione colore NATURAL ${styleKey}`, amount: 100, qty: numColors });
    }

    if (isBicolor) {
      alerts.push('NATURAL Alizeè/EVIDENCE: vietato carteggiare tra finitura 1 e finitura 2 (stesse giornata).');
    }
  }

  // ─── SENSE ────────────────────────────────────────────────────────────────
  if (line === 'SENSE') {
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    let extraFondoQty = 0;
    if (input.fughe_residue === 'CRITICHE') {
      extraFondoQty = n10 + n2; // same packaging for extra fondo pass
      alerts.push('SENSE su piastrelle/mosaico: fughe residue critiche → passaggio extra di fondo aggiunto.');
    }
    const skuFondo10 = findTexSku(store, 'SENSE', 'FONDO', 'COLORABILE_10MQ');
    const skuFinitura10 = findTexSku(store, 'SENSE', 'FINITURA', 'COLORABILE_10MQ');
    const skuKit2 = findTexSku(store, 'SENSE', 'KIT', 'COLORABILE_2MQ');
    const skuColorFondo10 = findTexSku(store, 'SENSE', 'COLORE_FONDO', 'COLORABILE_10MQ');
    const skuColorFinitura10 = findTexSku(store, 'SENSE', 'COLORE_FINITURA', 'COLORABILE_10MQ');
    const skuColorKit2 = findTexSku(store, 'SENSE', 'COLORE_KIT', 'COLORABILE_2MQ');

    const totalFondo10 = n10 + extraFondoQty;
    if (totalFondo10 > 0 && skuFondo10) lines.push({ sku_id: skuFondo10, descrizione: descOf(store, skuFondo10), qty: totalFondo10, prezzo_unitario: priceOf(store, skuFondo10), totale: totalFondo10 * priceOf(store, skuFondo10), section: 'texture' });
    if (n10 > 0 && skuFinitura10) lines.push({ sku_id: skuFinitura10, descrizione: descOf(store, skuFinitura10), qty: n10, prezzo_unitario: priceOf(store, skuFinitura10), totale: n10 * priceOf(store, skuFinitura10), section: 'texture' });
    if (n2 > 0 && skuKit2) lines.push({ sku_id: skuKit2, descrizione: descOf(store, skuKit2), qty: n2, prezzo_unitario: priceOf(store, skuKit2), totale: n2 * priceOf(store, skuKit2), section: 'texture' });
    if (totalFondo10 > 0 && skuColorFondo10) lines.push({ sku_id: skuColorFondo10, descrizione: descOf(store, skuColorFondo10), qty: totalFondo10, prezzo_unitario: priceOf(store, skuColorFondo10), totale: totalFondo10 * priceOf(store, skuColorFondo10), section: 'texture' });
    if (n10 > 0 && skuColorFinitura10) lines.push({ sku_id: skuColorFinitura10, descrizione: descOf(store, skuColorFinitura10), qty: n10, prezzo_unitario: priceOf(store, skuColorFinitura10), totale: n10 * priceOf(store, skuColorFinitura10), section: 'texture' });
    if (n2 > 0 && skuColorKit2) lines.push({ sku_id: skuColorKit2, descrizione: descOf(store, skuColorKit2), qty: n2, prezzo_unitario: priceOf(store, skuColorKit2), totale: n2 * priceOf(store, skuColorKit2), section: 'texture' });
  }

  // ─── DEKORA ───────────────────────────────────────────────────────────────
  if (line === 'DEKORA') {
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    const skuFondo10 = findTexSku(store, 'DEKORA', 'FONDO', 'COLORABILE_10MQ');
    const skuFinitura10 = findTexSku(store, 'DEKORA', 'FINITURA', 'COLORABILE_10MQ');
    const skuKit2 = findTexSku(store, 'DEKORA', 'KIT', 'COLORABILE_2MQ');
    const skuColorFondo10 = findTexSku(store, 'DEKORA', 'COLORE_FONDO', 'COLORABILE_10MQ');
    const skuColorFinitura10 = findTexSku(store, 'DEKORA', 'COLORE_FINITURA', 'COLORABILE_10MQ');
    const skuColorKit2 = findTexSku(store, 'DEKORA', 'COLORE_KIT', 'COLORABILE_2MQ');

    if (n10 > 0 && skuFondo10) lines.push({ sku_id: skuFondo10, descrizione: descOf(store, skuFondo10), qty: n10, prezzo_unitario: priceOf(store, skuFondo10), totale: n10 * priceOf(store, skuFondo10), section: 'texture' });
    if (n10 > 0 && skuFinitura10) lines.push({ sku_id: skuFinitura10, descrizione: descOf(store, skuFinitura10), qty: n10, prezzo_unitario: priceOf(store, skuFinitura10), totale: n10 * priceOf(store, skuFinitura10), section: 'texture' });
    if (n2 > 0 && skuKit2) lines.push({ sku_id: skuKit2, descrizione: descOf(store, skuKit2), qty: n2, prezzo_unitario: priceOf(store, skuKit2), totale: n2 * priceOf(store, skuKit2), section: 'texture' });
    if (n10 > 0 && skuColorFondo10) lines.push({ sku_id: skuColorFondo10, descrizione: descOf(store, skuColorFondo10), qty: n10, prezzo_unitario: priceOf(store, skuColorFondo10), totale: n10 * priceOf(store, skuColorFondo10), section: 'texture' });
    if (n10 > 0 && skuColorFinitura10) lines.push({ sku_id: skuColorFinitura10, descrizione: descOf(store, skuColorFinitura10), qty: n10, prezzo_unitario: priceOf(store, skuColorFinitura10), totale: n10 * priceOf(store, skuColorFinitura10), section: 'texture' });
    if (n2 > 0 && skuColorKit2) lines.push({ sku_id: skuColorKit2, descrizione: descOf(store, skuColorKit2), qty: n2, prezzo_unitario: priceOf(store, skuColorKit2), totale: n2 * priceOf(store, skuColorKit2), section: 'texture' });

    alerts.push('DEKORA: due mani di finitura nella stessa giornata (a fresco). Non interrompere tra le mani.');
  }

  // ─── LAMINE ───────────────────────────────────────────────────────────────
  if (line === 'LAMINE') {
    if (!input.lamine_pattern) {
      throw new DataError('LAMINE_NO_PATTERN', 'LAMINE richiede selezione pattern', {});
    }
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    const skuFondo10 = findTexSku(store, 'LAMINE', 'FONDO', '10MQ');
    const skuLamine10 = findTexSku(store, 'LAMINE', 'LAMINE', '10MQ');
    const skuKit2 = findTexSku(store, 'LAMINE', 'KIT', '2MQ');

    if (n10 > 0 && skuFondo10) lines.push({ sku_id: skuFondo10, descrizione: descOf(store, skuFondo10), qty: n10, prezzo_unitario: priceOf(store, skuFondo10), totale: n10 * priceOf(store, skuFondo10), section: 'texture' });
    if (n10 > 0 && skuLamine10) lines.push({ sku_id: skuLamine10, descrizione: descOf(store, skuLamine10), qty: n10, prezzo_unitario: priceOf(store, skuLamine10), totale: n10 * priceOf(store, skuLamine10), section: 'texture' });
    if (n2 > 0 && skuKit2) lines.push({ sku_id: skuKit2, descrizione: descOf(store, skuKit2), qty: n2, prezzo_unitario: priceOf(store, skuKit2), totale: n2 * priceOf(store, skuKit2), section: 'texture' });

    alerts.push('LAMINE: applicare fondo a rullo; spolvero lamine a rifiuto IMMEDIATO (non attendere).');
    alerts.push('LAMINE: carteggio 120 + aspirazione prima dei protettivi.');
  }

  // ─── CORLITE ──────────────────────────────────────────────────────────────
  if (line === 'CORLITE') {
    const isBicolor = style === 'COR_EVIDENCE';
    const { n4, n1 } = computePackaging4Plus1(area_mq);
    const styleKey = isBicolor ? 'EVIDENCE' : 'CHROMO';
    const skuKit4 = findTexSku(store, 'CORLITE', `KIT4_${styleKey}`, 'PRECOLORED');
    const skuKit1 = findTexSku(store, 'CORLITE', `KIT1_${styleKey}`, 'PRECOLORED');

    if (n4 > 0 && skuKit4) lines.push({ sku_id: skuKit4, descrizione: descOf(store, skuKit4), qty: n4, prezzo_unitario: priceOf(store, skuKit4), totale: n4 * priceOf(store, skuKit4), section: 'texture' });
    if (n1 > 0 && skuKit1) lines.push({ sku_id: skuKit1, descrizione: descOf(store, skuKit1), qty: n1, prezzo_unitario: priceOf(store, skuKit1), totale: n1 * priceOf(store, skuKit1), section: 'texture' });

    if (isBicolor) {
      alerts.push('CORLITE EVIDENCE: applicare colore 2 a fresco entro 15–20 minuti dal colore 1.');
    }
    alerts.push('CORLITE: attendere 24–36 ore prima dei protettivi; carteggio 180.');
  }

  // ─── MATERIAL ─────────────────────────────────────────────────────────────
  if (line === 'MATERIAL') {
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    const skuKit10 = findTexSku(store, 'MATERIAL', 'KIT', '10MQ');
    const skuKit2 = findTexSku(store, 'MATERIAL', 'KIT', '2MQ');

    if (n10 > 0 && skuKit10) lines.push({ sku_id: skuKit10, descrizione: descOf(store, skuKit10), qty: n10, prezzo_unitario: priceOf(store, skuKit10), totale: n10 * priceOf(store, skuKit10), section: 'texture' });
    if (n2 > 0 && skuKit2) lines.push({ sku_id: skuKit2, descrizione: descOf(store, skuKit2), qty: n2, prezzo_unitario: priceOf(store, skuKit2), totale: n2 * priceOf(store, skuKit2), section: 'texture' });

    // Optional surface color
    if (color_mode === 'CUSTOM_FEE0' && input.color_primary) {
      const colorSource = input.color_primary.type;
      const mani_colore = Math.ceil(area_mq * 0.25);
      if (colorSource === 'NATURAL_24') {
        const skuNordcolor = 'NORDCOLOR_ART_NCS_RAL_1KG_1KG';
        lines.push({ sku_id: skuNordcolor, descrizione: descOf(store, skuNordcolor), qty: mani_colore, prezzo_unitario: priceOf(store, skuNordcolor), totale: mani_colore * priceOf(store, skuNordcolor), section: 'texture', note: 'Colore superficiale – non in massa' });
      } else {
        const skuDekorArt = 'DEKOR_ART_W_1_KG_1KG';
        lines.push({ sku_id: skuDekorArt, descrizione: descOf(store, skuDekorArt), qty: mani_colore, prezzo_unitario: priceOf(store, skuDekorArt), totale: mani_colore * priceOf(store, skuDekorArt), section: 'texture', note: 'Colore superficiale – non in massa' });
      }
      alerts.push('MATERIAL con colore superficiale: il colore è in superficie, NON in massa. Far accettare esplicitamente al cliente.');
    }
  }

  return {
    pre_texture_kg: preQty > 0 ? preQty * area_mq : 0,
    pre_texture_sku_id: null,
    cart_lines: lines,
    hard_alerts: alerts,
    fees,
  };
}
