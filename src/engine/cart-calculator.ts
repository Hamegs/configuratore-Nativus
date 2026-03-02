import type { DataStore } from '../utils/data-loader';
import type { CartLine, CartFee, CartHardNote, CartSummary, CartProcedureStep } from '../types/cart';
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
  procedure_texture: CartProcedureStep[];
  procedure_protettivi: CartProcedureStep[];
  computation_errors: { code: string; text: string }[];
}

function buildStepOverrides(state: WizardState): Partial<Record<string, string>> {
  if (!state.ras2k_upgrade || state.ras2k_upgrade === 'KEEP') return {};
  const replacement = state.ras2k_upgrade === 'RAS_BASE' ? 'S_RAS_BASE_1_35' : 'S_RAS_BQ_2_0';
  return { S_RAS_2K_1_5: replacement };
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
  const computation_errors: { code: string; text: string }[] = [];

  if (!state.ambiente || !state.texture_line || !state.protettivo) {
    throw new DataError('CART_INCOMPLETE_STATE', 'Stato wizard incompleto per generare il carrello.', {});
  }

  // ─── Risolvi procedura pavimento ──────────────────────────────────────────
  let procedure_floor: import('./step-resolver').ResolvedProcedure | null = null;
  if (state.mq_pavimento > 0 && state.supporto_floor) {
    const input = buildRuleInputFromWizard(state, 'FLOOR');
    if (input) {
      try {
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
        procedure_floor = resolveStepsForRule(store, rule.rule_id, 'FLOOR', state.mq_pavimento, buildStepOverrides(state));
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
      } catch (err) {
        if (err instanceof DataError) {
          computation_errors.push({ code: err.code, text: err.message });
          all_alerts.push({ code: err.code, text: `Pavimento: ${err.message}`, severity: 'hard' });
        } else { throw err; }
      }
    }
  }

  // ─── Risolvi procedura pareti ─────────────────────────────────────────────
  let procedure_wall: import('./step-resolver').ResolvedProcedure | null = null;
  if (state.mq_pareti > 0 && state.supporto_wall) {
    const input = buildRuleInputFromWizard(state, 'WALL');
    if (input) {
      try {
        const rule = matchDecisionTable(store.decisionTable, input);
        procedure_wall = resolveStepsForRule(store, rule.rule_id, 'WALL', state.mq_pareti, buildStepOverrides(state));
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
      } catch (err) {
        if (err instanceof DataError) {
          computation_errors.push({ code: err.code, text: err.message });
          all_alerts.push({ code: err.code, text: `Pareti: ${err.message}`, severity: 'hard' });
        } else { throw err; }
      }
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

  // ─── Massetto doccia piatto NUOVO ────────────────────────────────────────
  all_lines.push(...buildDocciaPiattoLines(store, state));

  // ─── Consolidamento righe duplicate (stesso sku_id nella stessa section) ──
  const consolidated = consolidateLines(all_lines);

  const total_lines = consolidated.reduce((acc, l) => acc + l.totale, 0);
  const total_fees = all_fees.reduce((acc, f) => acc + f.amount * f.qty, 0);

  // ─── Costruisci procedure texture ─────────────────────────────────────────
  const procedure_texture: CartProcedureStep[] = texResult.cart_lines
    .filter(l => l.section === 'texture')
    .map((line, i) => ({
      step_order: (i + 1) * 10,
      name: line.descrizione,
      product_id: line.product_id ?? null,
      qty_total_kg: (line as CartLine & { qty_raw?: number }).qty_raw ?? null,
      unit: line.pack_unit ?? null,
      section: 'texture' as const,
      hard_alerts: i === 0 ? texResult.hard_alerts : [],
    }));

  // ─── Costruisci procedure protettivi ──────────────────────────────────────
  const procedure_protettivi: CartProcedureStep[] = protResult.step_descriptions.map(s => ({
    step_order: s.step_order,
    name: s.name,
    product_id: s.product_id,
    qty_total_kg: s.qty_total_kg,
    unit: s.unit,
    section: 'protettivi' as const,
    diluizione: s.diluizione,
    potlife_min: s.potlife_min,
    t_min_h: s.t_min_h,
    t_max_h: s.t_max_h,
    note: s.note,
    hard_alerts: [],
  }));

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
    procedure_texture,
    procedure_protettivi,
    computation_errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCALETTA TECNICA (solo nomi prodotti, niente prezzi / confezioni)
// ─────────────────────────────────────────────────────────────────────────────

export interface TechnicalProduct {
  name: string;
  step_order: number;
}

export interface TechnicalSection {
  title: string;
  products: TechnicalProduct[];
}

export interface TechnicalSchedule {
  sections: TechnicalSection[];
  hard_alerts: string[];
}

/**
 * Restituisce solo la scaletta operativa (prodotto → sezione) senza calcolare
 * confezioni né prezzi. Usata da StepReview per mostrare la procedura prima
 * di aggiungere al carrello.
 */
export function computeTechnicalSchedule(store: DataStore, state: WizardState): TechnicalSchedule {
  const sections: TechnicalSection[] = [];
  const hard_alerts: string[] = [];

  if (!state.ambiente || !state.texture_line || !state.protettivo) {
    throw new DataError('INCOMPLETE_STATE', 'Stato wizard incompleto.', {});
  }

  // ─── Preparazione supporto ─────────────────────────────────────────────────
  const prepFloor: TechnicalProduct[] = [];
  const prepWall: TechnicalProduct[] = [];

  if (state.mq_pavimento > 0 && state.supporto_floor) {
    const input = buildRuleInputFromWizard(state, 'FLOOR');
    if (input) {
      try {
        let rule;
        if (state.supporto_floor === 'F_COMP') {
          const ct = state.sub_answers_floor.tile_bedding as 'AS' | 'EP' ?? 'AS';
          rule = resolveCompRule(store.decisionTable, effectiveAmbiente(state), ct);
        } else if (state.supporto_floor === 'F_PAR_RM') {
          const ct = state.sub_answers_floor.parquet_comp ?? 'AS';
          rule = resolveCompRule(store.decisionTable, effectiveAmbiente(state), ct, 'PAR');
        } else {
          rule = matchDecisionTable(store.decisionTable, input);
        }
        const proc = resolveStepsForRule(store, rule.rule_id, 'FLOOR', 1, buildStepOverrides(state));
        proc.steps.forEach(s => {
          if (s.name) prepFloor.push({ name: s.name, step_order: s.step_order });
        });
      } catch { /* noop — errore già gestito in computeFullCart */ }
    }
  }

  if (state.mq_pareti > 0 && state.supporto_wall) {
    const input = buildRuleInputFromWizard(state, 'WALL');
    if (input) {
      try {
        const rule = matchDecisionTable(store.decisionTable, input);
        const proc = resolveStepsForRule(store, rule.rule_id, 'WALL', 1, buildStepOverrides(state));
        proc.steps.forEach(s => {
          if (s.name) prepWall.push({ name: s.name, step_order: s.step_order });
        });
      } catch { /* noop */ }
    }
  }

  // Doccia piatto NUOVO → aggiungi massetto epossidico automaticamente
  if (state.presenza_doccia && state.doccia_piatto_type === 'NUOVO') {
    const docArea = (state.doccia_larghezza ?? 0) * (state.doccia_lunghezza ?? 0);
    if (docArea > 0) {
      prepFloor.push({ name: 'Fondo Base — strato adesivo piatto doccia', step_order: 5 });
      prepFloor.push({ name: 'Massetto epossidico drenante (18 kg/m²/cm)', step_order: 6 });
      prepFloor.push({ name: 'Rasante Base Quarzo su massetto', step_order: 7 });
      prepFloor.push({ name: 'Armatura rete 160 g/m²', step_order: 8 });
    }
  }

  const allPrep = [
    ...prepFloor.map(p => ({ ...p, label: 'Pavimento' })),
    ...prepWall.map(p => ({ ...p, step_order: p.step_order + 1000, label: 'Parete' })),
  ].sort((a, b) => a.step_order - b.step_order);

  if (allPrep.length > 0) {
    sections.push({
      title: 'PREPARAZIONE SUPPORTO',
      products: allPrep,
    });
  }

  // ─── Texture ───────────────────────────────────────────────────────────────
  const texArea = state.mq_pavimento + state.mq_pareti;
  const macro: 'FLOOR' | 'WALL' = state.mq_pavimento > 0 ? 'FLOOR' : 'WALL';
  try {
    const texResult = computeTextureCart(store, {
      line: state.texture_line,
      style: state.texture_style!,
      area_mq: texArea,
      macro,
      color_mode: state.color_mode,
      color_primary: state.color_primary,
      color_secondary: state.color_secondary,
      lamine_pattern: state.lamine_pattern,
      last_base_layer: detectLastBaseLayer(null, null),
      fughe_residue: state.sub_answers_wall.fughe_residue ?? state.sub_answers_floor.fughe_residue,
      env_id: effectiveAmbiente(state),
    });
    texResult.hard_alerts.forEach(a => hard_alerts.push(a));
    const texProducts = texResult.cart_lines
      .filter(l => l.section === 'texture')
      .map((l, i) => ({ name: l.descrizione, step_order: (i + 1) * 10 }));
    if (texProducts.length > 0) {
      sections.push({ title: 'TEXTURE', products: texProducts });
    }
  } catch { /* noop */ }

  // ─── Protettivo ────────────────────────────────────────────────────────────
  try {
    const usoSup = deriveUsoSuperficie(state);
    const protResult = computeProtettiviCart(store, state.protettivo, state.texture_line, texArea, usoSup);
    const protProducts = protResult.step_descriptions.map(s => ({
      name: s.name,
      step_order: s.step_order,
    }));
    if (protProducts.length > 0) {
      sections.push({ title: 'PROTETTIVO', products: protProducts });
    }
  } catch { /* noop */ }

  return { sections, hard_alerts };
}

// ─── Massetto doccia piatto NUOVO — linee extra nel carrello ─────────────────
// Sequenza: Fondo Base adesivo → spolvero Quarzo 0,7-1,2 a rifiuto → Rasante Base Quarzo → Rete 160.
// CRYSTEPO/MAS_EP non incluso: aggiungere in admin quando il prodotto sarà configurato.
function buildDocciaPiattoLines(store: DataStore, state: WizardState): CartLine[] {
  if (!state.presenza_doccia || state.doccia_piatto_type !== 'NUOVO') return [];
  const docArea = (state.doccia_larghezza ?? 0) * (state.doccia_lunghezza ?? 0);
  if (docArea <= 0) return [];

  const proc = resolveStepsForRule(store, 'PIATTO_DOCCIA_NUOVO', 'FLOOR', docArea);
  const lines: CartLine[] = [];

  proc.steps.forEach(step => {
    if (step.product_id && step.qty_total !== undefined) {
      const skus = store.packagingSku.filter(p => p.product_id === step.product_id);
      if (skus.length > 0) {
        const best = skus.sort((a, b) => (b.pack_size ?? 0) - (a.pack_size ?? 0))[0];
        const qty = Math.ceil(step.qty_total / (best.pack_size ?? 1));
        const price = store.listino.find(l => l.sku_id === best.sku_id)?.prezzo_listino ?? 0;
        lines.push({
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

  return lines;
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
