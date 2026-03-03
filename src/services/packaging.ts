import type { DataStore } from '../utils/data-loader';
import type { PackagedItem, ServiceSection } from '../types/services';
import type { PackagingStrategy } from '../types/project';
import type { TechnicalGroupEnriched } from './technical';
import { computePackagingOptions, bestOption } from '../engine/packaging-optimizer';
import { DataError } from '../engine/errors';
import { getCommercialName } from '../utils/product-names';

export function computePackagedItems(
  groups: TechnicalGroupEnriched[],
  store: DataStore,
  mode: PackagingStrategy,
  fromRooms: string[] = [],
): PackagedItem[] {
  const items: PackagedItem[] = [];

  for (const group of groups) {
    if (group.section !== 'texture') continue;
    if (!group._textureCartLines) continue;

    for (const line of group._textureCartLines) {
      items.push({
        row_id: crypto.randomUUID(),
        product_id: group.product_id,
        sku_id: line.sku_id,
        nomeCommerciale: line.descrizione,
        description: line.descrizione,
        destination: group.destination,
        section: 'texture',
        qty_packs: line.qty,
        pack_size: line.pack_size ?? 0,
        pack_unit: line.pack_unit ?? 'mq',
        prezzo_unitario: line.prezzo_unitario,
        totale: line.totale,
        from_rooms: fromRooms,
        status: 'active',
        source: 'auto',
      });
    }
  }

  type AggEntry = {
    product_id: string;
    section: ServiceSection;
    destination: string | null;
    description: string;
    qty_raw: number;
    unit: string;
  };

  const aggMap = new Map<string, AggEntry>();
  for (const group of groups) {
    if (group.section === 'texture') continue;
    const key = `${group.product_id}::${group.section}::${group.destination ?? ''}`;
    const existing = aggMap.get(key);
    if (existing) {
      existing.qty_raw += group.qty_raw;
    } else {
      aggMap.set(key, {
        product_id: group.product_id,
        section: group.section,
        destination: group.destination,
        description: group.description,
        qty_raw: group.qty_raw,
        unit: group.unit,
      });
    }
  }

  for (const [, agg] of aggMap) {
    const skus = store.packagingSku.filter(s => s.product_id === agg.product_id);
    if (skus.length === 0) {
      throw new DataError(
        'NO_SKU_FOR_PRODUCT',
        `Nessuna SKU di confezionamento per: ${agg.product_id}`,
        { product_id: agg.product_id },
      );
    }
    const options = computePackagingOptions(agg.qty_raw, skus, store.listino);
    const best = bestOption(options, mode);
    if (!best) continue;

    const nomeCommerciale = getCommercialName(agg.product_id) ?? agg.description;
    items.push({
      row_id: crypto.randomUUID(),
      product_id: agg.product_id,
      sku_id: best.sku_id,
      nomeCommerciale,
      description: agg.description,
      destination: agg.destination,
      section: agg.section,
      qty_packs: best.qty_packs,
      pack_size: best.pack_size,
      pack_unit: best.pack_unit,
      prezzo_unitario: best.prezzo_unitario,
      totale: best.totale,
      from_rooms: fromRooms,
      status: 'active',
      source: 'auto',
    });
  }

  return items;
}
