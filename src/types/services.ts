export type ServiceSection = 'fondo' | 'texture' | 'protettivi' | 'din' | 'speciale';

export interface TechnicalGroup {
  id: string;
  product_id: string;
  nomeCommerciale: string;
  description: string;
  section: ServiceSection;
  destination: string | null;
  texture_line?: string;
  color_label?: string;
  qty_raw: number;
  unit: string;
}

export interface PackagedItem {
  row_id: string;
  product_id: string;
  sku_id: string;
  nomeCommerciale: string;
  description: string;
  destination: string | null;
  section: ServiceSection;
  qty_packs: number;
  pack_size: number;
  pack_unit: string;
  prezzo_unitario: number;
  totale: number;
  from_rooms?: string[];
  status: 'active' | 'excluded';
  source: 'auto' | 'manual';
}
