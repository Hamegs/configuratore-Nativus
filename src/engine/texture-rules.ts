import type { DataStore } from '../utils/data-loader';
import type { TextureLineId, TextureStyleId } from '../types/enums';
import type { ColorSelection } from '../types/texture';
import type { CartLine } from '../types/cart';
import { DataError } from './errors';

type CartSection = CartLine['section'];
const TEX: CartSection = 'texture';

export interface TextureInput {
  line: TextureLineId;
  style: TextureStyleId | null;
  area_mq: number;
  macro: 'FLOOR' | 'WALL';
  color_mode: string | null;
  color_primary: ColorSelection | null;
  color_secondary: ColorSelection | null;
  lamine_pattern: string | null;
  last_base_layer: string;
  fughe_residue?: string;
  env_id: string;
  zone_label?: string;
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
  const n1 = remainder > 0 ? 1 : 0;
  return { n4, n1 };
}

function findTexSku(
  store: DataStore,
  line_id: string,
  component: string,
  mode: string,
  pack_size_mq?: number,
  paramIncludes?: string,
): string | null {
  const entry = store.texturePackagingSku.find(t => {
    if (t.line_id !== line_id) return false;
    if (t.component !== component) return false;
    if (t.mode !== mode) return false;
    if (pack_size_mq !== undefined && t.pack_size_mq !== pack_size_mq) return false;
    if (paramIncludes !== undefined && !(t.param ?? '').includes(paramIncludes)) return false;
    return true;
  });
  return entry?.sku_id ?? null;
}

function priceOf(store: DataStore, sku_id: string): number {
  const direct = store.listino.find(l => l.sku_id === sku_id);
  if (direct) return direct.prezzo_listino;
  const texEntry = store.texturePackagingSku.find(t => t.sku_id === sku_id);
  if (texEntry?.product_id) {
    return store.listino.find(l => l.sku_id === texEntry.product_id)?.prezzo_listino ?? 0;
  }
  return 0;
}

function addLine(
  store: DataStore,
  lines: CartLine[],
  sku_id: string | null,
  qty: number,
  section: CartSection,
  descrizione: string,
  note?: string,
) {
  if (!sku_id || qty <= 0) return;
  const texEntry = store.texturePackagingSku.find(t => t.sku_id === sku_id);
  const commercialId = texEntry?.product_id || sku_id;
  const price = priceOf(store, sku_id);
  lines.push({
    sku_id: commercialId,
    descrizione,
    qty,
    prezzo_unitario: price,
    totale: qty * price,
    section,
    note,
  });
}

function deriveColorMode(
  line: TextureLineId,
  color_mode: string | null,
  color_primary: ColorSelection | null,
): string {
  if (color_mode && color_mode !== '') return color_mode;
  if (line === 'LAMINE') return 'PATTERN';
  if (line === 'CORLITE') return 'CUSTOM_FEE0';
  if (line === 'MATERIAL') return 'NEUTRO';
  const customSystems = ['RAL', 'NCS', 'PANTONE_C', 'ALTRO'];
  if (color_primary && customSystems.includes(color_primary.type)) return 'CUSTOM_PRECOLORED';
  return 'COLORABILE';
}

export function computeTextureCart(
  store: DataStore,
  input: TextureInput,
): TextureConsumption {
  const { line, style, area_mq, color_mode, color_primary, lamine_pattern } = input;
  const alerts: string[] = [];
  const lines: CartLine[] = [];
  const fees: Array<{ description: string; amount: number; qty: number }> = [];

  if (area_mq <= 0) {
    return { pre_texture_kg: 0, pre_texture_sku_id: null, cart_lines: [], hard_alerts: [], fees: [] };
  }

  const preQty = getPreTextureConsumption(input.last_base_layer);
  const effMode = deriveColorMode(line, color_mode, color_primary);
  const colorLabel = color_primary?.label ?? null;
  const zone = input.zone_label ?? null;

  function d(phase: string): string {
    let desc = phase ? `${line} ${phase}` : `${line}`;
    if (colorLabel) desc += ` — ${colorLabel}`;
    if (zone) desc += ` — ${zone}`;
    return desc;
  }

  // ─── NATURAL ──────────────────────────────────────────────────────────────
  if (line === 'NATURAL') {
    const isBicolor = style === 'ALIZEE_EVIDENCE_4';
    const styleParam = isBicolor ? 'style=ALIZEE_EVIDENCE_4' : 'style=CHROMO';
    const isCustom = effMode === 'CUSTOM_PRECOLORED';
    const modeKey = isCustom ? 'CUSTOM_PRECOLORED' : 'COLORABILE';
    const { n10, n2 } = computePackaging10Plus2(area_mq);

    addLine(store, lines, findTexSku(store, 'NATURAL', 'FONDO', modeKey, 10), n10, TEX, d('Fondo'));
    addLine(store, lines, findTexSku(store, 'NATURAL', 'FINITURA', modeKey, 10), n10, TEX, d('Finitura'));
    addLine(store, lines, findTexSku(store, 'NATURAL', 'KIT', modeKey, 2, styleParam), n2, TEX, d('Kit'));

    if (!isCustom) {
      addLine(store, lines, findTexSku(store, 'NATURAL', 'COLORE_FONDO', 'COLORABILE', 10), n10, TEX, d('Colore Fondo'));
      addLine(store, lines, findTexSku(store, 'NATURAL', 'COLORE_FINITURA', 'COLORABILE', 10), n10, TEX, d('Colore Finitura'));
      const colorsCount = isBicolor ? 'colors=2' : 'colors=1';
      addLine(store, lines, findTexSku(store, 'NATURAL', 'COLORE_KIT', 'COLORABILE', 2, colorsCount), n2, TEX, d('Colore Kit'));
    } else {
      const numColors = isBicolor ? 2 : 1;
      fees.push({ description: 'Personalizzazione colore NATURAL', amount: 100, qty: numColors });
    }

    if (isBicolor) {
      alerts.push('NATURAL Alizeè/EVIDENCE: vietato carteggiare tra finitura 1 e finitura 2 (stessa giornata).');
    }
  }

  // ─── SENSE ────────────────────────────────────────────────────────────────
  if (line === 'SENSE') {
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    let extraFondoN10 = 0;
    if (input.fughe_residue === 'CRITICHE') {
      extraFondoN10 = Math.ceil(area_mq / 10);
      alerts.push('SENSE su piastrelle/mosaico: fughe residue critiche → passaggio extra di fondo aggiunto.');
    }
    addLine(store, lines, findTexSku(store, 'SENSE', 'FONDO', 'COLORABILE', 10), n10 + extraFondoN10, TEX, d('Fondo'));
    addLine(store, lines, findTexSku(store, 'SENSE', 'FINITURA', 'COLORABILE', 10), n10, TEX, d('Finitura'));
    addLine(store, lines, findTexSku(store, 'SENSE', 'KIT', 'COLORABILE', 2), n2, TEX, d('Kit'));
    addLine(store, lines, findTexSku(store, 'SENSE', 'COLORE_FONDO', 'COLORABILE', 10), n10 + extraFondoN10, TEX, d('Colore Fondo'));
    addLine(store, lines, findTexSku(store, 'SENSE', 'COLORE_FINITURA', 'COLORABILE', 10), n10, TEX, d('Colore Finitura'));
    addLine(store, lines, findTexSku(store, 'SENSE', 'COLORE_KIT', 'COLORABILE', 2), n2, TEX, d('Colore Kit'));
  }

  // ─── DEKORA ───────────────────────────────────────────────────────────────
  if (line === 'DEKORA') {
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    addLine(store, lines, findTexSku(store, 'DEKORA', 'FONDO', 'COLORABILE', 10), n10, TEX, d('Fondo'));
    addLine(store, lines, findTexSku(store, 'DEKORA', 'FINITURA', 'COLORABILE', 10), n10, TEX, d('Finitura'));
    addLine(store, lines, findTexSku(store, 'DEKORA', 'KIT', 'COLORABILE', 2), n2, TEX, d('Kit'));
    addLine(store, lines, findTexSku(store, 'DEKORA', 'COLORE_FONDO', 'COLORABILE', 10), n10, TEX, d('Colore Fondo'));
    addLine(store, lines, findTexSku(store, 'DEKORA', 'COLORE_FINITURA', 'COLORABILE', 10), n10, TEX, d('Colore Finitura'));
    addLine(store, lines, findTexSku(store, 'DEKORA', 'COLORE_KIT', 'COLORABILE', 2), n2, TEX, d('Colore Kit'));
    alerts.push('DEKORA: due mani di finitura nella stessa giornata (a fresco). Non interrompere tra le mani.');
  }

  // ─── LAMINE ───────────────────────────────────────────────────────────────
  if (line === 'LAMINE') {
    if (!lamine_pattern) {
      throw new DataError('LAMINE_NO_PATTERN', 'LAMINE richiede selezione pattern', {});
    }
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    const patternLabel = lamine_pattern;
    function dL(phase: string): string {
      let desc = `LAMINE ${phase}`;
      if (patternLabel) desc += ` — ${patternLabel}`;
      if (zone) desc += ` — ${zone}`;
      return desc;
    }
    addLine(store, lines, findTexSku(store, 'LAMINE', 'FONDO', 'PATTERN', 10), n10, TEX, dL('Fondo'));
    addLine(store, lines, findTexSku(store, 'LAMINE', 'LAMINE', 'PATTERN', 10), n10, TEX, dL(''));
    addLine(store, lines, findTexSku(store, 'LAMINE', 'KIT', 'PATTERN', 2), n2, TEX, dL('Kit'));
    alerts.push('LAMINE: applicare fondo a rullo; spolvero lamine a rifiuto IMMEDIATO (non attendere).');
    alerts.push('LAMINE: carteggio 120 + aspirazione prima dei protettivi.');
  }

  // ─── CORLITE ──────────────────────────────────────────────────────────────
  if (line === 'CORLITE') {
    const isBicolor = style === 'COR_EVIDENCE';
    const styleParam = isBicolor ? 'style=EVIDENCE' : 'style=CHROMO';
    const { n4, n1 } = computePackaging4Plus1(area_mq);
    addLine(store, lines, findTexSku(store, 'CORLITE', 'KIT', 'CUSTOM_FEE0', 4, styleParam), n4, TEX, d('Kit'));
    addLine(store, lines, findTexSku(store, 'CORLITE', 'KIT', 'CUSTOM_FEE0', 1, styleParam), n1, TEX, d('Kit'));
    if (isBicolor) {
      alerts.push('CORLITE EVIDENCE: applicare colore 2 a fresco entro 15–20 minuti dal colore 1.');
    }
    alerts.push('CORLITE: attendere 24–36 ore prima dei protettivi; carteggio 180.');
  }

  // ─── MATERIAL ─────────────────────────────────────────────────────────────
  if (line === 'MATERIAL') {
    const { n10, n2 } = computePackaging10Plus2(area_mq);
    addLine(store, lines, findTexSku(store, 'MATERIAL', 'MATERIAL', 'NEUTRO', 10), n10, TEX, d(''));
    addLine(store, lines, findTexSku(store, 'MATERIAL', 'KIT', 'NEUTRO', 2), n2, TEX, d('Kit'));

    if (effMode === 'CUSTOM_FEE0' && color_primary) {
      const mani_colore = Math.ceil(area_mq * 0.25);
      if (color_primary.type === 'NATURAL_24') {
        addLine(store, lines, findTexSku(store, 'MATERIAL', 'COLORE_SUPERFICIALE', 'CUSTOM_FEE0'), mani_colore, TEX, d('Colore Superficiale'), 'Colore superficiale – non in massa');
      } else {
        addLine(store, lines, findTexSku(store, 'MATERIAL', 'COLORE_SUPERFICIALE', 'METALLIC_FEE0'), mani_colore, TEX, d('Colore Superficiale'), 'Colore superficiale – non in massa');
      }
      alerts.push('MATERIAL con colore superficiale: colore in SUPERFICIE, non in massa. Far accettare al cliente.');
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
