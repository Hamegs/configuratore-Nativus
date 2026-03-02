import type { DataStore } from '../utils/data-loader';
import type { CartLine, CartFee, CartHardNote, CartSummary } from '../types/cart';
import type { WizardState } from '../types/wizard-state';
import { matchDecisionTable, buildRuleInputFromWizard, resolveCompRule } from './decision-table';
import { resolveStepsForRule } from './step-resolver';
import { computeTextureCart } from './texture-rules';
import { computeProtettiviCart } from './protettivi-rules';
import { computeDinCart, buildDinInputsFromWizard } from './din-calculator';
import { DataError } from './errors';
import { effectiveAmbiente, isEffectiveShower } from './effective-ambiente';

export interface CartResult {
  summary: CartSummary;
  procedure_floor: import('./step-resolver').ResolvedProcedure | null;
  procedure_wall: import('./step-resolver').ResolvedProcedure | null;
}

function deriveUsoSuperficie(state: WizardState): 'PAVIMENTO' | 'PARETE_FUORI_BAGNO' | 'BAGNO_DOCCIA' {
  const eff = effectiveAmbiente(state);
  if (eff === 'DOC' || eff === 'DIN') return 'BAGNO_DOCCIA';
  if (eff === 'BAG') return 'BAGNO_DOCCIA';
  if (state.mq_pavimento > 0) return 'PAVIMENTO';
  return 'PARETE_FUORI_BAGNO';
}

function detectLastBaseLayer(procedure_floor: import('./step-resolver').ResolvedProcedure | null, procedure_wall: import('./step-resolver').ResolvedProcedure | null): string {
  const allSteps = [
    ...(procedure_floor?.steps ?? []),
    ...(procedure_wall?.steps ?? []),
  ];
  const baseProducts = ['BARR_VAP_4', 'RAS_BASE_Q', 'RAS_BASE', 'FONDO_BASE'];
  for (const prod of baseProducts) {
    if (allSteps.some(s => s.product_id === prod)) return prod;
  }
  return 'RAS_BASE';
}

export function computeFullCart(
  store: DataStore,
  state: WizardState,
): CartResult {
  const all_lines: CartLine[] = [];
  const all_fees: CartFee[] = [];
  const all_alerts: CartHardNote[] = [];

  if (!state.ambiente || !state.texture_line || !state.protettivo) {
    throw new DataError('CART_INCOMPLETE_STATE', 'Stato wizard incompleto per generare il carrello.', {});
  }

  // ─── Risolvi procedura pavimento ──────────────────────────────────────────
  let procedure_floor: import('./step-resolver').ResolvedProcedure | null = null;
  if (state.mq_pavimento > 0 && state.supporto_floor) {
    const input = buildRuleInputFromWizard(state, 'FLOOR');
    if (input) {
      let rule;
      if (state.supporto_floor === 'F_COMP') {
        const comp_type = state.sub_answers_floor.tile_bedding as 'AS' | 'EP' ?? 'AS';
        rule = resolveCompRule(store.decisionTable, effectiveAmbiente(state), comp_type);
      } else if (state.supporto_floor === 'F_PAR_RM') {
        const comp_type = state.sub_answers_floor.parquet_comp ?? 'AS';
        rule = resolveCompRule(store.decisionTable, effectiveAmbiente(state), comp_type, 'PAR');
      } else {
        rule = matchDecisionTable(store.decisionTable, input);
      }
      procedure_floor = resolveStepsForRule(store, rule.rule_id, 'FLOOR', state.mq_pavimento);
      procedure_floor.steps.forEach(step => {
        if (step.product_id && step.qty_total !== undefined) {
          const skus = store.packagingSku.filter(p => p.product_id === step.product_id);
          if (skus.length > 0) {
            const best = skus.sort((a, b) => (b.pack_size ?? 0) - (a.pack_size ?? 0))[0];
            const qty = Math.ceil(step.qty_total / (best.pack_size ?? 1));
            const price = store.listino.find(l => l.sku_id === best.sku_id)?.prezzo_listino ?? 0;
            all_lines.push({
              sku_id: best.sku_id,
              descrizione: best.descrizione_sku,
              qty,
              prezzo_unitario: price,
              totale: qty * price,
              product_id: step.product_id,
              section: 'fondo',
              qty_raw: step.qty_total,
              pack_size: best.pack_size,
              pack_unit: best.pack_unit,
            });
          }
        }
      });
    }
  }

  // ─── Risolvi procedura pareti ─────────────────────────────────────────────
  let procedure_wall: import('./step-resolver').ResolvedProcedure | null = null;
  if (state.mq_pareti > 0 && state.supporto_wall) {
    const input = buildRuleInputFromWizard(state, 'WALL');
    if (input) {
      const rule = matchDecisionTable(store.decisionTable, input);
      procedure_wall = resolveStepsForRule(store, rule.rule_id, 'WALL', state.mq_pareti);
      procedure_wall.steps.forEach(step => {
        if (step.product_id && step.qty_total !== undefined) {
          const skus = store.packagingSku.filter(p => p.product_id === step.product_id);
          if (skus.length > 0) {
            const best = skus.sort((a, b) => (b.pack_size ?? 0) - (a.pack_size ?? 0))[0];
            const qty = Math.ceil(step.qty_total / (best.pack_size ?? 1));
            const price = store.listino.find(l => l.sku_id === best.sku_id)?.prezzo_listino ?? 0;
            all_lines.push({
              sku_id: best.sku_id,
              descrizione: best.descrizione_sku,
              qty,
              prezzo_unitario: price,
              totale: qty * price,
              product_id: step.product_id,
              section: 'fondo',
              qty_raw: step.qty_total,
              pack_size: best.pack_size,
              pack_unit: best.pack_unit,
            });
          }
        }
      });
    }
  }

  // ─── Texture ──────────────────────────────────────────────────────────────
  const lastBase = detectLastBaseLayer(procedure_floor, procedure_wall);
  const texArea = state.mq_pavimento + state.mq_pareti;
  const macro: 'FLOOR' | 'WALL' = state.mq_pavimento > 0 ? 'FLOOR' : 'WALL';
  const texResult = computeTextureCart(store, {
    line: state.texture_line,
    style: state.texture_style!,
    area_mq: texArea,
    macro,
    color_mode: state.color_mode,
    color_primary: state.color_primary,
    color_secondary: state.color_secondary,
    lamine_pattern: state.lamine_pattern,
    last_base_layer: lastBase,
    fughe_residue: state.sub_answers_wall.fughe_residue ?? state.sub_answers_floor.fughe_residue,
    env_id: effectiveAmbiente(state),
  });
  all_lines.push(...texResult.cart_lines);
  texResult.fees.forEach(f => all_fees.push(f));
  texResult.hard_alerts.forEach(a => all_alerts.push({ code: 'TEX_ALERT', text: a, severity: 'hard' }));

  // ─── Protettivi ───────────────────────────────────────────────────────────
  const usoSup = deriveUsoSuperficie(state);
  const protResult = computeProtettiviCart(store, state.protettivo, state.texture_line, texArea, usoSup);
  all_lines.push(...protResult.cart_lines);
  protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));

  // ─── DIN / accessori doccia ───────────────────────────────────────────────
  if (state.presenza_doccia) {
    const dinInputs = buildDinInputsFromWizard(state);
    const dinResult = computeDinCart(store, dinInputs);
    all_lines.push(...dinResult.cart_lines);
    dinResult.hard_alerts.forEach(a => all_alerts.push({ code: 'DIN_ALERT', text: a, severity: 'hard' }));
  } else if (state.ambiente === 'DIN' && state.din_inputs) {
    const dinResult = computeDinCart(store, state.din_inputs);
    all_lines.push(...dinResult.cart_lines);
    dinResult.hard_alerts.forEach(a => all_alerts.push({ code: 'DIN_ALERT', text: a, severity: 'hard' }));
  }

  // ─── Consolidamento righe duplicate (stesso sku_id nella stessa section) ──
  const consolidated = consolidateLines(all_lines);

  const total_lines = consolidated.reduce((acc, l) => acc + l.totale, 0);
  const total_fees = all_fees.reduce((acc, f) => acc + f.amount * f.qty, 0);

  return {
    summary: {
      lines: consolidated,
      fees: all_fees,
      hard_notes: all_alerts,
      total_eur: total_lines + total_fees,
      total_lines_eur: total_lines,
      total_fees_eur: total_fees,
      generated_at: new Date().toISOString(),
    },
    procedure_floor,
    procedure_wall,
  };
}

function consolidateLines(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of lines) {
    const existing = map.get(line.sku_id);
    if (existing) {
      existing.qty += line.qty;
      existing.totale += line.totale;
    } else {
      map.set(line.sku_id, { ...line });
    }
  }
  return Array.from(map.values());
}
