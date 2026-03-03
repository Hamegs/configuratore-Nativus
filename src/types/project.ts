import type { WizardState } from './wizard-state';
import type { CartLine } from './cart';
import type { CartResult } from '../engine/cart-calculator';

export const ROOM_TYPES = [
  { id: 'SOGGIORNO',  label: 'Soggiorno',   env_default: 'ORD', icon: '🛋️' },
  { id: 'CUCINA',     label: 'Cucina',       env_default: 'ORD', icon: '🍳' },
  { id: 'CAMERA',     label: 'Camera',       env_default: 'ORD', icon: '🛏️' },
  { id: 'BAGNO',      label: 'Bagno',        env_default: 'BAG', icon: '🚿' },
  { id: 'LAVANDERIA', label: 'Lavanderia',   env_default: 'ORD', icon: '🫧' },
  { id: 'ALTRO',      label: 'Altro',        env_default: 'ORD', icon: '🏠' },
] as const;

export type PackagingStrategy =
  | 'MINIMO_SFRIDO'
  | 'ECONOMICO'
  | 'CONFEZIONI_GRANDI'
  | 'MANUALE';

export interface ConfigLogEntry {
  id: string;
  timestamp: string;
  room_id: string | null;
  room_name: string | null;
  sku_id: string;
  product_name: string;
  qty_before: number;
  qty_after: number;
  mode_before: PackagingStrategy;
  action: 'override' | 'add_manual' | 'exclude' | 'restore' | 'remove';
}

export interface StepLavorazione {
  id: string;
  id_ambiente: string;
  numero_step: number;
  descrizione_step: string;
  prodotti_coinvolti: string;
  consumi_step: string;
  note_tecniche: string;
}

export interface ProjectRoom {
  id: string;
  room_type: string;
  custom_name: string;
  is_configured: boolean;
  wizard_state: WizardState | null;
  cart_lines: CartLine[];
  cart_result: CartResult | null;
  step_lavorazioni: StepLavorazione[];
  computation_errors: { code: string; text: string }[];
}

export interface AggregatedRawQty {
  product_id: string;
  sku_id_default: string;
  descrizione: string;
  qty_raw: number;
  pack_size_default: number;
  pack_unit: string;
  section: CartLine['section'];
  from_rooms: string[];
}

export interface ProjectCartRow {
  row_id: string;
  product_id: string | null;
  sku_id: string;
  descrizione: string;
  qty_packs: number;
  pack_size: number;
  pack_unit: string;
  prezzo_unitario: number;
  totale: number;
  source: 'auto' | 'manual';
  status: 'active' | 'excluded';
  is_override: boolean;
  section: CartLine['section'];
  from_rooms?: string[];
}
