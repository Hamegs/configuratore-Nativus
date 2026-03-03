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

export function bestOption(options: PackagingOption[], strategy: PackagingStrategy): PackagingOption | null {
  if (options.length === 0) return null;
  switch (strategy) {
    case 'MINIMO_SFRIDO':
      return options.slice().sort((a, b) => a.sfrido - b.sfrido || a.totale - b.totale)[0];
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
