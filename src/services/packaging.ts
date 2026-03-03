import type { DataStore } from '../utils/data-loader';
import type { PackagedItem, ServiceSection } from '../types/services';
import type { PackagingStrategy } from '../types/project';
import type { TechnicalGroupEnriched } from './technical';
import { computePackagingOptions, bestOption } from '../engine/packaging-optimizer';
import { computeTextureCart } from '../engine/texture-rules';
import { DataError } from '../engine/errors';
import { getCommercialName } from '../utils/product-names';

export function computePackagedItems(
  groups: TechnicalGroupEnriched[],
  store: DataStore,
  mode: PackagingStrategy,
  fromRooms: string[] = [],
): PackagedItem[] {
  const items: PackagedItem[] = [];

  type TexAgg = {
    totalArea: number;
    baseInput: NonNullable<TechnicalGroupEnriched['_textureInput']>;
    line: string;
  };
  const texAggMap = new Map<string, TexAgg>();
  for (const group of groups) {
    if (group.section !== 'texture') continue;
    if (!group._textureInput) continue;
    const lineId = group.texture_line ?? group.product_id;
    const key = `${lineId}::${group.color_label ?? ''}`;
    const existing = texAggMap.get(key);
    if (existing) {
      existing.totalArea += group.qty_raw;
    } else {
      texAggMap.set(key, { totalArea: group.qty_raw, baseInput: group._textureInput, line: lineId });
    }
  }

  for (const [, agg] of texAggMap) {
    const combinedInput = { ...agg.baseInput, area_mq: agg.totalArea, zone_label: undefined };
    let textureLines = computeTextureCart(store, combinedInput).cart_lines;

    if (mode === 'CONFEZIONI_GRANDI') {
      const maxPossiblePack = Math.max(
        0,
        ...store.texturePackagingSku
          .filter(t => t.line_id === agg.line && (t.pack_size_mq ?? 0) > 0)
          .map(t => t.pack_size_mq as number),
      );
      if (maxPossiblePack > 0) {
        const nLarge = Math.ceil(agg.totalArea / maxPossiblePack);
        const adjustedArea = nLarge * maxPossiblePack;
        const recomputed = computeTextureCart(store, { ...combinedInput, area_mq: adjustedArea });
        textureLines = recomputed.cart_lines
          .filter(l => (l.pack_size ?? 0) >= maxPossiblePack)
          .map(l => {
            const newQty = Math.ceil(agg.totalArea / l.pack_size!);
            return { ...l, qty: newQty, totale: newQty * l.prezzo_unitario };
          });
      }
    }

    for (const line of textureLines) {
      items.push({
        row_id: crypto.randomUUID(),
        product_id: agg.line,
        sku_id: line.sku_id,
        nomeCommerciale: line.descrizione,
        description: line.descrizione,
        destination: null,
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
    try {
      const skus = store.packagingSku.filter(
        s => s.product_id === agg.product_id && (s.pack_size ?? 0) > 0,
      );
      if (skus.length === 0) {
        console.warn('[computePackagedItems] Nessuna SKU valida per:', agg.product_id);
        continue;
      }
      if ((agg.qty_raw ?? 0) <= 0) {
        console.warn('[computePackagedItems] qty_raw=0 per:', agg.product_id);
        continue;
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
    } catch (e) {
      console.error('[computePackagedItems] errore prodotto', agg.product_id, e);
    }
  }

  return items;
}
