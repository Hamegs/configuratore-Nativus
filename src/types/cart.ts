export interface CartLine {
  sku_id: string;
  descrizione: string;
  qty: number;
  prezzo_unitario: number;
  totale: number;
  product_id?: string;
  section: 'fondo' | 'texture' | 'protettivi' | 'din' | 'speciale';
  note?: string;
  qty_raw?: number;
  pack_size?: number;
  pack_unit?: string;
  destination?: string;
  color_label?: string;
}

/**
 * Raw quantity line — no packaging, no Math.ceil.
 * Contains the physical quantity needed (mq, kg, pz) for a product/environment.
 * Used as the single source-of-truth before any packaging calculation.
 */
export interface RawCartLine {
  environment_id: string;
  product_id: string;
  qty_raw: number;
  section: 'fondo' | 'texture' | 'protettivi' | 'din' | 'speciale';
  destination?: string;
  descrizione?: string;
  pack_unit?: string;
  /**
   * For texture items only: the original TextureInput used for re-packaging.
   * Typed as unknown to avoid circular dependency (texture-rules imports cart).
   */
  _texture_input?: unknown;
  color_label?: string;
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

export interface CartProcedureStep {
  step_order: number;
  name: string;
  product_id: string | null;
  qty_total_kg: number | null;
  unit: string | null;
  section: 'texture' | 'protettivi';
  diluizione?: string;
  potlife_min?: string;
  t_min_h?: string;
  t_max_h?: string;
  note?: string;
  hard_alerts: string[];
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
}
