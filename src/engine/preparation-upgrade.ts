import type { DataStore } from '../utils/data-loader';
import type { StepDefinition } from '../types/step';
import type { WizardState } from '../types/wizard-state';
import { enrichStepWithTimings } from './time-sanding-enricher';
import { computeQtyTotal } from './step-resolver';

// ─── Tipi ────────────────────────────────────────────────────────────────────

export type BaseProductId = 'RAS_2K' | 'RAS_BASE' | 'RAS_BASE_Q';
export type UpgradeKey = 'UPGRADE_BASE' | 'UPGRADE_BASE_Q';

export interface UpgradeOption {
  target: BaseProductId;
  marketing_label: string;
  description: string;
}

// ─── Configurazione upgrade (admin-configurable) ──────────────────────────────

export const preparationUpgradeConfig: Partial<Record<BaseProductId, Partial<Record<UpgradeKey, UpgradeOption>>>> = {
  RAS_2K: {
    UPGRADE_BASE: {
      target: 'RAS_BASE',
      marketing_label: 'Rasante Base',
      description: "Monocomponente pronto all'uso — maggiore stabilità meccanica",
    },
    UPGRADE_BASE_Q: {
      target: 'RAS_BASE_Q',
      marketing_label: 'Rasante Base Quarzo',
      description: 'Bicomponente impermeabile — resistenza strutturale superiore',
    },
  },
  RAS_BASE: {
    UPGRADE_BASE_Q: {
      target: 'RAS_BASE_Q',
      marketing_label: 'Rasante Base Quarzo',
      description: 'Prestazioni meccaniche superiori e maggiore capacità di compensazione',
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Rileva il layer strutturale di base nei steps.
 * Priorità: RAS_BASE_Q > RAS_BASE > RAS_2K
 */
export function detectBaseLayer(steps: StepDefinition[]): BaseProductId | null {
  if (steps.some(s => s.product_id === 'RAS_BASE_Q')) return 'RAS_BASE_Q';
  if (steps.some(s => s.product_id === 'RAS_BASE'))   return 'RAS_BASE';
  if (steps.some(s => s.product_id === 'RAS_2K'))     return 'RAS_2K';
  return null;
}

function renumberSteps(steps: StepDefinition[]): StepDefinition[] {
  return steps.map((s, i) => ({ ...s, step_order: (i + 1) * 10 }));
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Layer post-processing applicato dopo applyTextureTechnicalModifiers().
 * Sostituisce il layer strutturale di base con quello scelto dall'utente.
 *
 * Regole:
 * - RAS_2K → può essere upgradato a RAS_BASE o RAS_BASE_Q
 * - RAS_BASE → può essere upgradato a RAS_BASE_Q
 * - RAS_BASE_Q → nessun upgrade possibile (già massimo)
 * - KEEP → nessuna modifica
 *
 * Idempotente: rieseguita su steps già modificati non crea duplicati.
 * Non genera coesistenza tra base originale e base upgradato.
 * Non effettua downgrade.
 */
export function applyPreparationUpgrade(
  store: DataStore,
  steps: StepDefinition[],
  state: WizardState,
  area_mq: number,
): StepDefinition[] {
  const upgrade = state.preparation_upgrade;
  if (!upgrade || upgrade === 'KEEP') return [...steps];

  const currentBase = detectBaseLayer(steps);
  // No base rilevata o già al massimo → nessuna modifica
  if (!currentBase || currentBase === 'RAS_BASE_Q') return [...steps];

  const upgradeOption = preparationUpgradeConfig[currentBase]?.[upgrade as UpgradeKey];
  if (!upgradeOption) return [...steps];

  const targetProductId = upgradeOption.target;
  const libStep = store.stepLibrary.find(s => s.product_id === targetProductId);
  if (!libStep) return [...steps];

  // Sostituisce TUTTE le occorrenze del currentBase (incluse extra coat da Rule C/D):
  // - Prima occorrenza: usa consumo standard dalla stepLibrary
  // - Occorrenze successive (extra coat): mantiene qty custom (0.8 kg/m²) ma aggiorna product
  let isFirstOccurrence = true;

  const result = steps.map(s => {
    if (s.product_id !== currentBase) return s;

    if (isFirstOccurrence) {
      isFirstOccurrence = false;
      const qty_total =
        libStep.qty !== null && libStep.unit !== null && area_mq > 0
          ? computeQtyTotal(libStep.qty, libStep.unit, area_mq)
          : undefined;
      return enrichStepWithTimings(store, {
        ...libStep,
        step_order: s.step_order,
        qty_total,
      });
    } else {
      // Extra coat (da Rule C/D) — mantiene qty, aggiorna product
      const extraQty = s.qty ?? libStep.qty;
      const extraUnit = s.unit ?? libStep.unit ?? 'kg/m²';
      const extraQtyTotal = extraQty !== null && area_mq > 0 ? extraQty * area_mq : undefined;
      return enrichStepWithTimings(store, {
        ...libStep,
        step_order: s.step_order,
        qty: extraQty,
        unit: extraUnit,
        qty_total: extraQtyTotal,
      });
    }
  });

  return renumberSteps(result);
}
