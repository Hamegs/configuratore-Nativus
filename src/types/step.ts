import type { StepTypeId } from './enums';

export interface StepLibraryEntry {
  step_id: string;
  step_type_id: StepTypeId;
  name: string;
  product_id: string | null;
  qty: number | null;
  unit: string | null;
}

export interface StepDefinition extends StepLibraryEntry {
  step_order: number;
  qty_total?: number;
  potlife_min?: string;
  min_overcoat?: string;
  max_overcoat?: string;
  sanding?: string;
  hard_alerts?: string[];
}
