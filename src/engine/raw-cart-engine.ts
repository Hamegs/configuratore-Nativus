/**
 * RAW CART ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Layer 1 → Raw per Environment  (qty_raw only, no packaging)
 * Layer 2 → Packaged per Environment
 * Layer 3 → Packaged Global Optimized
 *
 * This module is the ONLY place where Math.ceil is applied via packageLines().
 * No other module may call Math.ceil for packaging purposes.
 */

import type { DataStore } from '../utils/data-loader';
import type { RawCartLine, CartLine } from '../types/cart';
import type { PackagingStrategy } from '../types/project';
import type { TextureInput } from './texture-rules';
import { computePackagingOptions, bestOption, computeOptimalMix } from './packaging-optimizer';
import { computeTextureCart } from './texture-rules';
import { getCommercialName } from '../utils/product-names';

// ─── Layer 1 helpers ──────────────────────────────────────────────────────────

/**
 * Consolidate raw lines grouped by environment_id.
 * Within each environment: merges lines with same product_id + section + destination.
 * For texture: merges by product_id + color_label, accumulating area in _texture_input.
 */
export function consolidateRawByEnvironment(
  rawLines: RawCartLine[],
): Map<string, RawCartLine[]> {
  const result = new Map<string, RawCartLine[]>();

  for (const line of rawLines) {
    if (!result.has(line.environment_id)) result.set(line.environment_id, []);
    const envLines = result.get(line.environment_id)!;

    if (line.section === 'texture') {
      const texKey = `${line.product_id}::${line.color_label ?? ''}`;
      const existing = envLines.find(
        l => l.section === 'texture' && `${l.product_id}::${l.color_label ?? ''}` === texKey,
      );
      if (existing) {
        existing.qty_raw += line.qty_raw;
        if (existing._texture_input && line._texture_input) {
          const ex = existing._texture_input as TextureInput;
          const ln = line._texture_input as TextureInput;
          existing._texture_input = { ...ex, area_mq: ex.area_mq + ln.area_mq, zone_label: undefined };
        }
      } else {
        envLines.push({ ...line });
      }
    } else {
      const key = `${line.product_id}::${line.section}::${line.destination ?? ''}`;
      const existing = envLines.find(
        l => `${l.product_id}::${l.section}::${l.destination ?? ''}` === key,
      );
      if (existing) {
        existing.qty_raw += line.qty_raw;
      } else {
        envLines.push({ ...line });
      }
    }
  }

  return result;
}

/**
 * Consolidate raw lines globally (across all environments).
 * Ignores environment_id — merges all rooms.
 * For texture: groups by product_id + color_label, accumulating area.
 * For non-texture: groups by product_id + section + destination.
 */
export function consolidateRawGlobal(rawLines: RawCartLine[]): RawCartLine[] {
  const texMap = new Map<string, RawCartLine>();
  const nonTexMap = new Map<string, RawCartLine>();

  for (const line of rawLines) {
    if (line.section === 'texture') {
      const key = `${line.product_id}::${line.color_label ?? ''}`;
      const existing = texMap.get(key);
      if (existing) {
        existing.qty_raw += line.qty_raw;
        if (existing._texture_input && line._texture_input) {
          const ex = existing._texture_input as TextureInput;
          const ln = line._texture_input as TextureInput;
          existing._texture_input = { ...ex, area_mq: ex.area_mq + ln.area_mq, zone_label: undefined };
        }
      } else {
        texMap.set(key, { ...line, environment_id: 'global' });
      }
    } else {
      // For protettivi: include destination + color_label so different surfaces/colors stay separate.
      // For all other sections (fondo, din, etc.): merge globally by product_id + section.
      const key = line.section === 'protettivi'
        ? `${line.product_id}::protettivi::${line.destination ?? ''}::${line.color_label ?? ''}`
        : `${line.product_id}::${line.section}`;
      const existing = nonTexMap.get(key);
      if (existing) {
        existing.qty_raw += line.qty_raw;
      } else {
        nonTexMap.set(key, { ...line, environment_id: 'global' });
      }
    }
  }

  return [...Array.from(nonTexMap.values()), ...Array.from(texMap.values())];
}

// ─── Layer 2/3 — THE ONLY Math.ceil location ──────────────────────────────────

/**
 * Convert raw lines into packaged CartLine[].
 * This is THE ONLY function that applies Math.ceil for packaging.
 * Handles:
 *   - Texture: via computeTextureCart (respects CONFEZIONI_GRANDI strategy)
 *   - Non-texture: via computePackagingOptions + bestOption
 */
export function packageLines(
  store: DataStore,
  rawLines: RawCartLine[],
  strategy: PackagingStrategy,
): CartLine[] {
  const result: CartLine[] = [];

  // ── Texture ─────────────────────────────────────────────────────────────────
  for (const raw of rawLines.filter(l => l.section === 'texture')) {
    if (!raw._texture_input) {
      console.warn('[packageLines] Missing _texture_input for texture:', raw.product_id);
      continue;
    }
    const input = raw._texture_input as TextureInput;
    const combinedInput = { ...input, area_mq: raw.qty_raw, zone_label: undefined };

    let textureLines: CartLine[];
    try {
      textureLines = computeTextureCart(store, combinedInput).cart_lines;
    } catch (e) {
      console.error('[packageLines] computeTextureCart error:', raw.product_id, e);
      continue;
    }

    if (strategy === 'CONFEZIONI_GRANDI') {
      const maxPack = Math.max(
        0,
        ...store.texturePackagingSku
          .filter(t => t.line_id === raw.product_id && (t.pack_size_mq ?? 0) > 0)
          .map(t => t.pack_size_mq as number),
      );
      if (maxPack > 0) {
        const nLarge = Math.ceil(raw.qty_raw / maxPack);
        const adjustedArea = nLarge * maxPack;
        const recomputed = computeTextureCart(store, { ...combinedInput, area_mq: adjustedArea });
        textureLines = recomputed.cart_lines
          .filter(l => (l.pack_size ?? 0) >= maxPack)
          .map(l => {
            const newQty = Math.ceil(raw.qty_raw / l.pack_size!);
            return { ...l, qty: newQty, totale: newQty * l.prezzo_unitario };
          });
      }
    }

    for (const line of textureLines) {
      result.push({ ...line, qty_raw: raw.qty_raw });
    }
  }

  // ── Non-texture ──────────────────────────────────────────────────────────────
  for (const raw of rawLines.filter(l => l.section !== 'texture')) {
    if ((raw.qty_raw ?? 0) <= 0) {
      console.warn('[packageLines] qty_raw ≤ 0 for:', raw.product_id);
      continue;
    }
    const validSkus = store.packagingSku.filter(
      s => s.product_id === raw.product_id && (s.pack_size ?? 0) > 0,
    );
    if (validSkus.length === 0) {
      console.warn('[packageLines] No valid SKU for:', raw.product_id);
      continue;
    }
    const desc = raw.descrizione ?? getCommercialName(raw.product_id) ?? raw.product_id;

    // MINIMO_SFRIDO: greedy large-first mix — may produce multiple lines per product
    if (strategy === 'MINIMO_SFRIDO') {
      const mixItems = computeOptimalMix(raw.qty_raw, validSkus, store.listino);
      for (const item of mixItems) {
        result.push({
          sku_id: item.sku_id,
          descrizione: desc,
          qty: item.qty_packs,
          prezzo_unitario: item.prezzo_unitario,
          totale: item.subtotale,
          product_id: raw.product_id,
          section: raw.section,
          qty_raw: raw.qty_raw,
          pack_size: item.pack_size,
          pack_unit: item.pack_unit,
          destination: raw.destination,
          color_label: raw.color_label,
        });
      }
      continue;
    }

    // All other strategies: single best SKU
    const opts = computePackagingOptions(raw.qty_raw, validSkus, store.listino);
    const best = bestOption(opts, strategy);
    if (!best) continue;
    result.push({
      sku_id: best.sku_id,
      descrizione: desc,
      qty: best.qty_packs,
      prezzo_unitario: best.prezzo_unitario,
      totale: best.totale,
      product_id: raw.product_id,
      section: raw.section,
      qty_raw: raw.qty_raw,
      pack_size: best.pack_size,
      pack_unit: best.pack_unit,
      destination: raw.destination,
      color_label: raw.color_label,
    });
  }

  return result;
}
