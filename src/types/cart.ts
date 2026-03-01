export interface CartLine {
  sku_id: string;
  descrizione: string;
  qty: number;
  prezzo_unitario: number;
  totale: number;
  product_id?: string;
  section: 'fondo' | 'texture' | 'protettivi' | 'din' | 'speciale';
  note?: string;
  qty_raw?: number;      // quantità raw prima del packaging (kg, m² o pz a seconda del prodotto)
  pack_size?: number;    // dimensione confezione usata
  pack_unit?: string;    // unità confezione
}

export interface CartFee {
  description: string;
  amount: number;
  qty: number;
}

export interface CartHardNote {
  code: string;
  text: string;
  severity: 'hard' | 'info';
}

export interface CartSummary {
  lines: CartLine[];
  fees: CartFee[];
  hard_notes: CartHardNote[];
  total_eur: number;
  total_lines_eur: number;
  total_fees_eur: number;
  generated_at: string;
}

export interface PackagingResult {
  product_id: string;
  total_needed: number;
  unit: string;
  packs: Array<{
    sku_id: string;
    descrizione: string;
    pack_size: number;
    qty: number;
    prezzo_unitario: number;
    totale: number;
  }>;
  waste_pct: number;
}
