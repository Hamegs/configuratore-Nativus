import type { DataStore } from '../utils/data-loader';
import type { StepDefinition } from '../types/step';

export function enrichStepWithTimings(
  store: DataStore,
  step: StepDefinition,
): StepDefinition {
  if (!step.product_id) return step;

  const param = store.texOpParams.find(p => p.item === step.product_id);
  if (!param) return step;

  return {
    ...step,
    potlife_min: param.potlife_min || undefined,
    min_overcoat: param.min_overcoat || undefined,
    max_overcoat: param.max_overcoat || undefined,
    sanding: param.sanding || undefined,
  };
}

export function buildOperationalNote(step: StepDefinition): string | null {
  const parts: string[] = [];

  if (step.potlife_min) {
    parts.push(`Pot-life: ${step.potlife_min} min`);
  }
  if (step.min_overcoat && step.max_overcoat) {
    parts.push(`Attesa: min ${step.min_overcoat} h — max ${step.max_overcoat} h`);
  } else if (step.min_overcoat) {
    parts.push(`Attesa min: ${step.min_overcoat} h`);
  }
  if (step.sanding) {
    parts.push(`Carteggio: ${step.sanding}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

export interface ProceduralStep {
  step_order: number;
  step_type_id: string;
  name: string;
  product_id: string | null;
  qty: number | null;
  qty_total: number | undefined;
  unit: string | null;
  operational_note: string | null;
  hard_alerts: string[];
  potlife_min?: string;
  min_overcoat?: string;
  max_overcoat?: string;
  sanding?: string;
}

export function toProceduralStep(step: StepDefinition): ProceduralStep {
  return {
    step_order: step.step_order,
    step_type_id: step.step_type_id,
    name: step.name,
    product_id: step.product_id,
    qty: step.qty,
    qty_total: step.qty_total,
    unit: step.unit,
    operational_note: buildOperationalNote(step),
    hard_alerts: step.hard_alerts ?? [],
    potlife_min: step.potlife_min,
    min_overcoat: step.min_overcoat,
    max_overcoat: step.max_overcoat,
    sanding: step.sanding,
  };
}
