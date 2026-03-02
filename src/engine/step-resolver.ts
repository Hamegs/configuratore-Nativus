import type { DataStore } from '../utils/data-loader';
import type { StepDefinition } from '../types/step';
import { DataError } from './errors';
import { enrichStepWithTimings } from './time-sanding-enricher';

export interface ResolvedProcedure {
  rule_id: string;
  macro: 'FLOOR' | 'WALL';
  steps: StepDefinition[];
}

export function resolveStepsForRule(
  store: DataStore,
  ruleId: string,
  macro: 'FLOOR' | 'WALL',
  area_mq: number,
  stepOverrides?: Partial<Record<string, string>>,
): ResolvedProcedure {
  const mapEntries = store.stepMap
    .filter(sm => sm.rule_id === ruleId)
    .sort((a, b) => a.step_order - b.step_order);

  if (mapEntries.length === 0) {
    throw new DataError(
      'NO_STEPS_FOR_RULE',
      `Nessun step trovato per rule_id: ${ruleId}`,
      { rule_id: ruleId },
    );
  }

  const steps: StepDefinition[] = mapEntries.map(entry => {
    const resolvedId = stepOverrides?.[entry.step_id] ?? entry.step_id;
    const libStep = store.stepLibrary.find(s => s.step_id === resolvedId);
    if (!libStep) {
      throw new DataError(
        'STEP_NOT_IN_LIBRARY',
        `Step '${resolvedId}' non trovato in step_library (rule: ${ruleId})`,
        { step_id: resolvedId, rule_id: ruleId },
      );
    }

    const qty_total =
      libStep.qty !== null && libStep.unit !== null && area_mq > 0
        ? computeQtyTotal(libStep.qty, libStep.unit, area_mq)
        : undefined;

    const base: StepDefinition = {
      ...libStep,
      step_order: entry.step_order,
      qty_total,
    };

    return enrichStepWithTimings(store, base);
  });

  return { rule_id: ruleId, macro, steps };
}

export function computeQtyTotal(qty: number, unit: string, area_mq: number): number {
  // Supported units: g/m², kg/m², kg/m²/cm (per cm di spessore, gestito separatamente)
  switch (unit) {
    case 'g/m²':
    case 'g/mq':
      return (qty * area_mq) / 1000; // convert to kg for cart
    case 'kg/m²':
    case 'kg/mq':
      return qty * area_mq;
    case 'g/ml':
      // Per metro lineare (crepe): qty in g/ml, area_mq used as ml (caller must pass ml not mq)
      return (qty * area_mq) / 1000;
    case 'kg/m²/cm':
    case 'kg/mq/cm':
      // Thickness-dependent: caller must pass effective area*thickness as area_mq
      return qty * area_mq;
    case 'pz':
    case 'pz/unit':
      return qty * area_mq; // area_mq interpreted as unit count
    case 'm²':
    case 'mq':
      return area_mq; // for mesh/rete: same as area
    default:
      return qty * area_mq;
  }
}
