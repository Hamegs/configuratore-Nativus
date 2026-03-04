/** How the pack_size is measured — drives the correct qty_raw unit in packaging engine. */
export type CoverageType = 'weight' | 'surface' | 'volume' | 'units';

export interface PackagingSku {
  sku_id: string;
  product_id: string;
  descrizione_sku: string;
  pack_size: number;
  pack_unit: string;
  /** Defines the measurement domain of pack_size.
   *  - 'weight'  → kg (default for most products)
   *  - 'surface' → m² (mesh/rete: pack_size = coverage area)
   *  - 'volume'  → litres
   *  - 'units'   → discrete pieces
   */
  coverage_type?: CoverageType;
  componenti: string;
  note_packaging: string;
}

export interface ListinoSku {
  sku_id: string;
  prezzo_listino: number;
  valuta: string;
  valid_from: string;
  valid_to: string;
  note_prezzo: string;
}
