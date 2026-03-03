import type { DataStore } from '../utils/data-loader';
import type { StepDefinition } from '../types/step';
import type { TextureLineId, StepTypeId } from '../types/enums';
import { enrichStepWithTimings } from './time-sanding-enricher';
import { computeQtyTotal } from './step-resolver';

// ─── Helpers — tutte operano su product_id, non step_id ─────────────────────
// I step nella step-library hanno step_id prefissati (es. S_RAS_2K_1_5)
// ma l'identità logica del prodotto è nel campo product_id (es. RAS_2K).

function hasProd(steps: StepDefinition[], product_id: string): boolean {
  return steps.some(s => s.product_id === product_id);
}

function countProd(steps: StepDefinition[], product_id: string): number {
  return steps.filter(s => s.product_id === product_id).length;
}

function insertAfterProd(
  steps: StepDefinition[],
  afterProductId: string,
  newStep: StepDefinition,
): StepDefinition[] {
  const idx = steps.findIndex(s => s.product_id === afterProductId);
  if (idx === -1) return [...steps, newStep];
  const result = [...steps];
  result.splice(idx + 1, 0, newStep);
  return result;
}

function insertAfterLastProd(
  steps: StepDefinition[],
  afterProductId: string,
  newStep: StepDefinition,
): StepDefinition[] {
  let lastIdx = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].product_id === afterProductId) lastIdx = i;
  }
  if (lastIdx === -1) return [...steps, newStep];
  const result = [...steps];
  result.splice(lastIdx + 1, 0, newStep);
  return result;
}

function replaceByProd(
  steps: StepDefinition[],
  targetProductId: string,
  replacement: StepDefinition,
): StepDefinition[] {
  return steps.map(s =>
    s.product_id === targetProductId ? { ...replacement, step_order: s.step_order } : s,
  );
}

/**
 * Cerca in stepLibrary il primo step con product_id corrispondente,
 * overrida qty e unit con i valori specificati, calcola qty_total.
 * Se non trovato in library crea uno step sintetico.
 */
function buildStep(
  store: DataStore,
  product_id: string,
  step_order: number,
  qty: number,
  unit: string,
  area_mq: number,
): StepDefinition {
  const libStep = store.stepLibrary.find(s => s.product_id === product_id);
  const qty_total = qty * area_mq;

  const base: StepDefinition = libStep
    ? { ...libStep, step_order, qty, unit, qty_total }
    : {
        step_id: product_id,
        step_type_id: 'STRC' as StepTypeId,
        name: product_id,
        product_id,
        qty,
        unit,
        step_order,
        qty_total,
      };

  return enrichStepWithTimings(store, base);
}

function renumberSteps(steps: StepDefinition[]): StepDefinition[] {
  return steps.map((s, i) => ({ ...s, step_order: (i + 1) * 10 }));
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Layer post-processing applicato dopo resolveStepsForRule().
 * Modifica la sequenza tecnica in base alla texture selezionata.
 *
 * Regole applicate in ordine:
 *   A — CORLITE: product RAS_BASE → sostituito con RAS_BASE_Q
 *   B — LAMINE/CORLITE + BARR_VAP_4: inserisce FONDO_BASE + QUARZO_01_03
 *   C — NATURAL extra rasante (senza BARR_VAP_4)
 *   D — LAMINE extra rasante (senza BARR_VAP_4)
 *   E — Primer SW (PR_SW) dopo RAS_2K
 *   F — Primer Bond SW (PR_BOND_SW) dopo RAS_BASE_Q (solo DEKORA/MATERIAL)
 *   G — SENSE: nessuna modifica
 *
 * Non muta l'array in input. Idempotente: rieseguita su steps già modificati non crea duplicati.
 */
export function applyTextureTechnicalModifiers(
  store: DataStore,
  steps: StepDefinition[],
  textureLine: TextureLineId,
  area_mq: number,
): StepDefinition[] {
  let result = [...steps];

  // ─── REGOLA A: CORLITE — RAS_BASE → RAS_BASE_Q ───────────────────────────
  if (textureLine === 'CORLITE' && hasProd(result, 'RAS_BASE')) {
    const libRasBaseQ = store.stepLibrary.find(s => s.product_id === 'RAS_BASE_Q');
    if (libRasBaseQ) {
      const qty_total =
        libRasBaseQ.qty !== null && libRasBaseQ.unit !== null && area_mq > 0
          ? computeQtyTotal(libRasBaseQ.qty, libRasBaseQ.unit, area_mq)
          : undefined;
      const replacement = enrichStepWithTimings(store, {
        ...libRasBaseQ,
        step_order: 0,
        qty_total,
      });
      result = replaceByProd(result, 'RAS_BASE', replacement);
    }
  }

  // ─── REGOLA B: LAMINE/CORLITE + BARR_VAP_4 ──────────────────────────────
  const hasBarrVap4 = hasProd(result, 'BARR_VAP_4');
  const isLamineOrCorlite = textureLine === 'LAMINE' || textureLine === 'CORLITE';
  let skipExtraRasante = false;

  if (isLamineOrCorlite && hasBarrVap4) {
    skipExtraRasante = true;
    const hasFondoBase = hasProd(result, 'FONDO_BASE');
    const hasQuarzo = hasProd(result, 'QUARZO_01_03');

    if (!hasFondoBase && !hasQuarzo) {
      const barrIdx = result.findIndex(s => s.product_id === 'BARR_VAP_4');
      const fondoStep = buildStep(store, 'FONDO_BASE', 0, 0.35, 'kg/m²', area_mq);
      const quarzoStep = buildStep(store, 'QUARZO_01_03', 0, 0.105, 'kg/m²', area_mq);
      result = [
        ...result.slice(0, barrIdx + 1),
        fondoStep,
        quarzoStep,
        ...result.slice(barrIdx + 1),
      ];
    } else if (!hasFondoBase) {
      result = insertAfterProd(
        result,
        'BARR_VAP_4',
        buildStep(store, 'FONDO_BASE', 0, 0.35, 'kg/m²', area_mq),
      );
    } else if (!hasQuarzo) {
      result = insertAfterProd(
        result,
        'FONDO_BASE',
        buildStep(store, 'QUARZO_01_03', 0, 0.105, 'kg/m²', area_mq),
      );
    }
  }

  // ─── REGOLA C: NATURAL extra rasante ─────────────────────────────────────
  if (textureLine === 'NATURAL' && !hasBarrVap4 && !skipExtraRasante) {
    const rasTargets = ['RAS_BASE', 'RAS_BASE_Q', 'RAS_2K'] as const;
    for (const prodId of rasTargets) {
      if (hasProd(result, prodId) && countProd(result, prodId) < 2) {
        const original = result.find(s => s.product_id === prodId)!;
        const extra = enrichStepWithTimings(store, {
          ...original,
          qty: 0.8,
          unit: 'kg/m²',
          qty_total: 0.8 * area_mq,
        });
        result = insertAfterProd(result, prodId, extra);
        break;
      }
    }
  }

  // ─── REGOLA D: LAMINE extra rasante ──────────────────────────────────────
  if (textureLine === 'LAMINE' && !hasBarrVap4 && !skipExtraRasante) {
    const rasTargets = ['RAS_BASE', 'RAS_BASE_Q'] as const;
    for (const prodId of rasTargets) {
      if (hasProd(result, prodId) && countProd(result, prodId) < 2) {
        const original = result.find(s => s.product_id === prodId)!;
        const extra = enrichStepWithTimings(store, {
          ...original,
          qty: 0.8,
          unit: 'kg/m²',
          qty_total: 0.8 * area_mq,
        });
        result = insertAfterProd(result, prodId, extra);
        break;
      }
    }
  }

  // ─── REGOLA E: Primer SW (PR_SW) dopo RAS_2K ─────────────────────────────
  // Inserito dopo l'ULTIMO RAS_2K (nel caso REGOLA C ne abbia aggiunto un doppione)
  const texWithPrimerSw: TextureLineId[] = ['NATURAL', 'SENSE', 'DEKORA', 'LAMINE', 'MATERIAL'];
  if (texWithPrimerSw.includes(textureLine) && hasProd(result, 'RAS_2K')) {
    const lastRas2kIdx = result.reduce<number>(
      (acc, s, i) => (s.product_id === 'RAS_2K' ? i : acc),
      -1,
    );
    const nextIsPrimerSw =
      lastRas2kIdx >= 0 &&
      lastRas2kIdx + 1 < result.length &&
      result[lastRas2kIdx + 1].product_id === 'PR_SW';

    if (!nextIsPrimerSw) {
      result = insertAfterLastProd(
        result,
        'RAS_2K',
        buildStep(store, 'PR_SW', 0, 0.15, 'kg/m²', area_mq),
      );
    }
  }

  // ─── REGOLA F: Primer Bond SW (PR_BOND_SW) dopo RAS_BASE_Q ──────────────
  const texWithPrimerBond: TextureLineId[] = ['DEKORA', 'MATERIAL'];
  if (texWithPrimerBond.includes(textureLine) && hasProd(result, 'RAS_BASE_Q')) {
    const rasBaseQIdx = result.findIndex(s => s.product_id === 'RAS_BASE_Q');
    const nextIsPrimerBond =
      rasBaseQIdx >= 0 &&
      rasBaseQIdx + 1 < result.length &&
      result[rasBaseQIdx + 1].product_id === 'PR_BOND_SW';

    if (!nextIsPrimerBond) {
      result = insertAfterLastProd(
        result,
        'RAS_BASE_Q',
        buildStep(store, 'PR_BOND_SW', 0, 0.10, 'kg/m²', area_mq),
      );
    }
  }

  // ─── REGOLA G: SENSE — nessuna modifica ──────────────────────────────────
  // (implicito: nessuna regola scatta per SENSE)

  return renumberSteps(result);
}
