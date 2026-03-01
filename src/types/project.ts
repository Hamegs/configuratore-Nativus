import type { WizardState } from './wizard-state';
import type { CartLine } from './cart';

export const ROOM_TYPES = [
  { id: 'SOGGIORNO',  label: 'Soggiorno',   env_default: 'ORD' },
  { id: 'CUCINA',     label: 'Cucina',       env_default: 'ORD' },
  { id: 'CAMERA',     label: 'Camera',       env_default: 'ORD' },
  { id: 'BAGNO',      label: 'Bagno',        env_default: 'BAG' },
  { id: 'LAVANDERIA', label: 'Lavanderia',   env_default: 'ORD' },
  { id: 'ALTRO',      label: 'Altro',        env_default: ''    },
] as const;

export type PackagingStrategy =
  | 'MINIMO_SFRIDO'
  | 'ECONOMICO'
  | 'CONFEZIONI_GRANDI'
  | 'CONFEZIONI_PICCOLE';

export interface ProjectRoom {
  id: string;
  room_type: string;
  custom_name: string;
  is_configured: boolean;
  wizard_state: WizardState | null;
  cart_lines: CartLine[];          // linee dall'ultima configurazione
}

export interface AggregatedRawQty {
  product_id: string;
  sku_id_default: string;          // SKU più comune usato nelle stanze
  descrizione: string;
  qty_raw: number;                 // quantità aggregata (kg, m² o pz)
  pack_size_default: number;
  pack_unit: string;
  section: CartLine['section'];
  from_rooms: string[];            // room custom_name
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
}
