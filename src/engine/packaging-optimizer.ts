import type { PackagingStrategy, ProjectCartRow, AggregatedRawQty } from '../types/project';
import type { PackagingSku, ListinoSku } from '../types/packaging';
import { DataError } from './errors';

export interface PackagingOption {
  sku_id: string;
  pack_size: number;
  pack_unit: string;
  prezzo_unitario: number;
  qty_packs: number;
  totale: number;
  sfrido: number;
}

export interface PackagingMixItem {
  sku_id: string;
  pack_size: number;
  pack_unit: string;
  qty_packs: number;
  prezzo_unitario: number;
  subtotale: number;
}

/**
 * Compute single-SKU packaging options for a raw quantity.
 *
 * The same formula `packs = Math.ceil(qty_raw / pack_size)` applies to all
 * coverage types — the caller is responsible for ensuring qty_raw is in the
 * correct unit:
 *   - coverage_type 'weight'  → qty_raw in kg,  pack_size in kg
 *   - coverage_type 'surface' → qty_raw in m²,  pack_size in m²
 *     (mesh/rete: 1 linear meter = 1 m² since roll width = 1 m)
 *   - coverage_type 'volume'  → qty_raw in L,   pack_size in L
 *   - coverage_type 'units'   → qty_raw in pcs, pack_size in pcs
 */
export function computePackagingOptions(
  qty_raw: number,
  skus: PackagingSku[],
  listino: ListinoSku[],
): PackagingOption[] {
  if (skus.length === 0 || qty_raw <= 0) return [];
  return skus.map(sku => {
    if (!sku.pack_size || sku.pack_size <= 0) {
      throw new DataError('INVALID_PACK_SIZE', `Pack size non valido per SKU: ${sku.sku_id}`, { sku_id: sku.sku_id });
    }
    const price = listino.find(l => l.sku_id === sku.sku_id)?.prezzo_listino ?? 0;
    const qty_packs = Math.ceil(qty_raw / sku.pack_size);
    const covered = qty_packs * sku.pack_size;
    return {
      sku_id: sku.sku_id,
      pack_size: sku.pack_size,
      pack_unit: sku.pack_unit,
      prezzo_unitario: price,
      qty_packs,
      totale: qty_packs * price,
      sfrido: +(covered - qty_raw).toFixed(4),
    };
  });
}

/**
 * Compute the optimal combination of package sizes to minimize waste.
 *
 * Algorithm (priority order):
 *   1. Minimize waste (total supplied − required)
 *   2. Minimize total number of packages
 *   3. Prefer larger packages
 *
 * Phase 1 — greedy large-first: use as many large packs as possible
 *   without exceeding the required quantity.
 * Phase 2 — cover remainder: pick the single SKU size that covers the
 *   remaining quantity with the least waste; on tie prefer the larger size.
 *
 * Returns one entry per pack size used (may be multiple entries when
 * a combination of sizes is optimal, e.g. 1×20kg + 3×1kg for 23 kg).
 */
export function computeOptimalMix(
  qty_raw: number,
  skus: PackagingSku[],
  listino: ListinoSku[],
): PackagingMixItem[] {
  const valid = skus.filter(s => (s.pack_size ?? 0) > 0);
  if (valid.length === 0 || qty_raw <= 0) return [];

  const sorted = [...valid].sort((a, b) => (b.pack_size as number) - (a.pack_size as number));

  if (sorted.length === 1) {
    const sku = sorted[0];
    const qty_packs = Math.ceil(qty_raw / sku.pack_size!);
    const price = listino.find(l => l.sku_id === sku.sku_id)?.prezzo_listino ?? 0;
    return [{
      sku_id: sku.sku_id,
      pack_size: sku.pack_size!,
      pack_unit: sku.pack_unit,
      qty_packs,
      prezzo_unitario: price,
      subtotale: qty_packs * price,
    }];
  }

  const mix = new Map<string, number>();
  let remaining = qty_raw;

  // Phase 1: use floor(remaining / size) of each size, large first
  for (const sku of sorted) {
    if (remaining <= 1e-9) break;
    const qty = Math.floor(remaining / sku.pack_size!);
    if (qty > 0) {
      mix.set(sku.sku_id, (mix.get(sku.sku_id) ?? 0) + qty);
      remaining = +(remaining - qty * sku.pack_size!).toFixed(9);
    }
  }

  // Phase 2: cover remaining with the SKU that produces the least waste
  if (remaining > 1e-9) {
    let bestSku: PackagingSku | null = null;
    let bestWaste = Infinity;
    for (const sku of sorted) {
      const qty = Math.ceil(remaining / sku.pack_size!);
      const waste = +(qty * sku.pack_size! - remaining).toFixed(9);
      // Less waste wins; on tie the largest size wins (sorted desc, so first match keeps priority)
      if (waste < bestWaste) {
        bestWaste = waste;
        bestSku = sku;
      }
    }
    if (bestSku) {
      const qty = Math.ceil(remaining / bestSku.pack_size!);
      mix.set(bestSku.sku_id, (mix.get(bestSku.sku_id) ?? 0) + qty);
    }
  }

  return sorted
    .filter(sku => (mix.get(sku.sku_id) ?? 0) > 0)
    .map(sku => {
      const qty_packs = mix.get(sku.sku_id)!;
      const price = listino.find(l => l.sku_id === sku.sku_id)?.prezzo_listino ?? 0;
      return {
        sku_id: sku.sku_id,
        pack_size: sku.pack_size!,
        pack_unit: sku.pack_unit,
        qty_packs,
        prezzo_unitario: price,
        subtotale: qty_packs * price,
      };
    });
}

export function bestOption(options: PackagingOption[], strategy: PackagingStrategy): PackagingOption | null {
  if (options.length === 0) return null;
  switch (strategy) {
    case 'MINIMO_SFRIDO':
      // Single-SKU fallback: pick the one with least waste, then fewest packs, then largest size.
      // The multi-SKU optimal mix is handled by computeOptimalMix / packageLines.
      return options.slice().sort((a, b) =>
        a.sfrido - b.sfrido || a.qty_packs - b.qty_packs || b.pack_size - a.pack_size,
      )[0];
    case 'ECONOMICO':
      return options.slice().sort((a, b) => a.totale - b.totale)[0];
    case 'CONFEZIONI_GRANDI':
      return options.slice().sort((a, b) => b.pack_size - a.pack_size)[0];
    case 'MANUALE':
      return options.slice().sort((a, b) => a.sfrido - b.sfrido || a.totale - b.totale)[0];
    default:
      return options[0];
  }
}

export function buildCartFromAggregated(
  aggregated: AggregatedRawQty[],
  allSkus: PackagingSku[],
  listino: ListinoSku[],
  strategy: PackagingStrategy,
): ProjectCartRow[] {
  const rows: ProjectCartRow[] = [];
  for (const agg of aggregated) {
    const skus = allSkus.filter(s => s.product_id === agg.product_id);
    if (skus.length === 0) {
      if (agg.section === 'texture') {
        const price = listino.find(l => l.sku_id === agg.sku_id_default)?.prezzo_listino ?? 0;
        const qty = agg.pack_size_default > 0
          ? Math.ceil(agg.qty_raw / agg.pack_size_default)
          : 1;
        rows.push({
          row_id: crypto.randomUUID(),
          product_id: agg.product_id,
          sku_id: agg.sku_id_default,
          descrizione: agg.descrizione,
          qty_packs: qty,
          pack_size: agg.pack_size_default,
          pack_unit: agg.pack_unit,
          prezzo_unitario: price,
          totale: qty * price,
          source: 'auto',
          status: 'active',
          is_override: false,
          section: agg.section,
          from_rooms: agg.from_rooms,
        });
        continue;
      }
      throw new DataError(
        'NO_SKU_FOR_PRODUCT',
        `Nessuna SKU di confezionamento trovata per il prodotto: ${agg.product_id}`,
        { product_id: agg.product_id },
      );
    }

    if (strategy === 'MINIMO_SFRIDO') {
      const mixItems = computeOptimalMix(agg.qty_raw, skus, listino);
      for (const item of mixItems) {
        rows.push({
          row_id: crypto.randomUUID(),
          product_id: agg.product_id,
          sku_id: item.sku_id,
          descrizione: agg.descrizione,
          qty_packs: item.qty_packs,
          pack_size: item.pack_size,
          pack_unit: item.pack_unit,
          prezzo_unitario: item.prezzo_unitario,
          totale: item.subtotale,
          source: 'auto',
          status: 'active',
          is_override: false,
          section: agg.section,
          from_rooms: agg.from_rooms,
        });
      }
      continue;
    }

    const opts = computePackagingOptions(agg.qty_raw, skus, listino);
    const best = bestOption(opts, strategy);
    if (!best) continue;
    rows.push({
      row_id: crypto.randomUUID(),
      product_id: agg.product_id,
      sku_id: best.sku_id,
      descrizione: agg.descrizione,
      qty_packs: best.qty_packs,
      pack_size: best.pack_size,
      pack_unit: best.pack_unit,
      prezzo_unitario: best.prezzo_unitario,
      totale: best.totale,
      source: 'auto',
      status: 'active',
      is_override: false,
      section: agg.section,
      from_rooms: agg.from_rooms,
    });
  }
  return rows;
}
