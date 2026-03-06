/**
 * stratigraphy-builder.ts
 *
 * Bridge between engine output (CartResult) and the visual layer.
 * Never modifies engine data. Only reads and enriches with CMS content.
 *
 * Pipeline:
 *   CartResult (engine)
 *     → groupByPhase()
 *     → enrichWithCMS()
 *     → StratigraphyDocument
 */

import type { CartResult } from '../engine/cart-calculator';
import type { CartLine } from '../types/cart';
import type { StepDefinition } from '../types/step';
import type { CartProcedureStep } from '../types/cart';
import type { AdminCMS } from '../store/admin-store';
import { loadDataStore } from '../utils/data-loader';

export type PhaseLabel = 'A' | 'B' | 'C';

export interface StratigraphyLayer {
  phase: PhaseLabel;
  phase_label: string;
  product_id: string | null;
  step_id: string | null;
  name: string;
  qty_display: string | null;
  unit: string | null;
  section: string;
  tool_ids: string[];
  tool_names: string[];
  cleaning_method: string;
  technical_notes: string;
  diluizione?: string;
  hard_alerts: string[];
}

export interface StratigraphyDocument {
  layers: StratigraphyLayer[];
  phases: {
    A: StratigraphyLayer[];
    B: StratigraphyLayer[];
    C: StratigraphyLayer[];
  };
  /** Media URLs resolved from IndexedDB (async — populated by caller) */
  media_urls: string[];
  support_id: string | null;
  texture_line: string | null;
  environment_type: string | null;
}

const PHASE_LABELS: Record<PhaseLabel, string> = {
  A: 'Preparazione',
  B: 'Texture',
  C: 'Protezione',
};

const SECTION_PHASE: Record<string, PhaseLabel> = {
  fondo: 'A', din: 'A', speciale: 'A', tracce: 'A',
  texture: 'B',
  protettivi: 'C',
};

type AnyProcedureStep = (StepDefinition | CartProcedureStep) & {
  step_id?: string;
  step_order?: number;
};

export function buildStratigraphyDocument(
  cartResult: CartResult | null,
  cartLines: CartLine[],
  cms: AdminCMS,
  opts?: {
    supportId?: string;
    textureLine?: string;
    environmentType?: string;
  }
): StratigraphyDocument {
  const store = loadDataStore();
  const stepLibMap = new Map(store.stepLibrary.map(s => [s.step_id, s]));
  const stepManualsMap = new Map(cms.stepManuals.map(m => [m.step_id, m]));
  const toolsMap = new Map(cms.tools.map(t => [t.id, t.name]));

  const layers: StratigraphyLayer[] = [];
  const seen = new Set<string>();

  function addStep(step: AnyProcedureStep, phase: PhaseLabel) {
    const dedupeKey = `${step.product_id ?? ''}::${step.name}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const stepId: string | null = (step as StepDefinition).step_id ?? null;
    const manual = stepId ? stepManualsMap.get(stepId) : undefined;
    void stepLibMap;

    const asPrep = step as StepDefinition;
    const asTex = step as CartProcedureStep;

    let qty: string | null = null;
    let unit: string | null = null;
    if (asPrep.qty_total != null && asPrep.unit) {
      qty = asPrep.qty_total.toFixed(2);
      unit = asPrep.unit;
    } else if (asTex.qty_total_kg != null && asTex.unit) {
      qty = asTex.qty_total_kg.toFixed(2);
      unit = asTex.unit;
    }

    const sectionRaw =
      (asTex as CartProcedureStep).section ??
      (phase === 'A' ? 'fondo' : phase === 'B' ? 'texture' : 'protettivi');

    const toolIds = manual?.tool_ids ?? [];

    layers.push({
      phase,
      phase_label: PHASE_LABELS[phase],
      product_id: step.product_id ?? null,
      step_id: stepId,
      name: step.name,
      qty_display: qty != null && unit ? `${qty} ${unit}` : null,
      unit,
      section: sectionRaw,
      tool_ids: toolIds,
      tool_names: toolIds.map(id => toolsMap.get(id) ?? id),
      cleaning_method: manual?.cleaning_method ?? '',
      technical_notes: manual?.technical_notes ?? '',
      diluizione: (asTex as CartProcedureStep).diluizione,
      hard_alerts: (asTex as CartProcedureStep).hard_alerts ?? [],
    });
  }

  if (cartResult) {
    const prepSteps: AnyProcedureStep[] = [
      ...(cartResult.procedure_floor?.steps ?? []),
      ...(cartResult.procedure_wall?.steps ?? []),
    ];
    const texSteps: AnyProcedureStep[] = cartResult.procedure_texture ?? [];
    const protSteps: AnyProcedureStep[] = cartResult.procedure_protettivi ?? [];

    const all = [
      ...prepSteps.map(s => ({ s, phase: 'A' as PhaseLabel })),
      ...texSteps.map(s => ({ s, phase: 'B' as PhaseLabel })),
      ...protSteps.map(s => ({ s, phase: 'C' as PhaseLabel })),
    ].sort((a, b) => (a.s.step_order ?? 0) - (b.s.step_order ?? 0));

    for (const { s, phase } of all) addStep(s, phase);
  }

  // Fallback: use cart lines if no procedure steps resolved
  if (layers.length === 0) {
    const lines = cartLines.length ? cartLines : (cartResult?.summary?.lines ?? []);
    for (const line of lines) {
      const pid = line.product_id ?? line.sku_id;
      const dedupeKey = `${pid}::${line.section}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const phase = SECTION_PHASE[line.section] ?? 'A';
      layers.push({
        phase,
        phase_label: PHASE_LABELS[phase],
        product_id: pid,
        step_id: null,
        name: line.descrizione ?? pid,
        qty_display: line.qty != null && line.pack_unit ? `${line.qty} ${line.pack_unit}` : null,
        unit: line.pack_unit ?? null,
        section: line.section,
        tool_ids: [],
        tool_names: [],
        cleaning_method: '',
        technical_notes: '',
        hard_alerts: [],
      });
    }
  }

  layers.sort((a, b) => a.phase.localeCompare(b.phase));

  return {
    layers,
    phases: {
      A: layers.filter(l => l.phase === 'A'),
      B: layers.filter(l => l.phase === 'B'),
      C: layers.filter(l => l.phase === 'C'),
    },
    media_urls: [],
    support_id: opts?.supportId ?? null,
    texture_line: opts?.textureLine ?? null,
    environment_type: opts?.environmentType ?? null,
  };
}

/** Resolve matching CMS stratigraphy media config for a given configuration */
export function findStratigraphyMediaConfig(
  cms: AdminCMS,
  supportId: string | null,
  systemName: string | null,
  environmentType: string | null
) {
  if (!supportId) return null;
  return cms.stratigraphyMedia.find(cfg => {
    if (cfg.support_id !== supportId) return false;
    if (cfg.system_name && systemName && cfg.system_name !== systemName) return false;
    if (cfg.environment_type && environmentType && cfg.environment_type !== environmentType) return false;
    return true;
  }) ?? null;
}
