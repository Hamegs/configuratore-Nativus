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

  // Guard: con multi-superficie basta avere almeno una surface con texture_line
  const hasTexture = state.surfaces.length > 0
    ? state.surfaces.some(s => s.texture_line !== null)
    : !!state.texture_line;
  if (!state.ambiente || !hasTexture || !state.protettivo) {
    throw new DataError('CART_INCOMPLETE_STATE', 'Stato wizard incompleto per generare il carrello.', {});
  }

  // Import TextureLineId per le conversioni tipo
  type TexLine = import('../types/enums').TextureLineId;

  // ─── Piastrella con tracce — riempimento pre-procedura ────────────────────
  all_lines.push(...computeTracceLines(store, state));

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

  // ─── Texture ─────────────────────────────────────────────────────────────
  // Modello multi-superficie: calcola per ogni Surface; fallback singola texture se surfaces è vuoto.
  const lastBase = detectLastBaseLayer(procedure_floor, procedure_wall);
  const allTexAlerts: string[] = [];
  const texProcLines: CartLine[] = [];  // raccoglie le righe texture per procedure_texture

  let texArea = 0;
  let primaryTexLine: TexLine = (state.texture_line ?? 'NATURAL') as TexLine;

  if (state.surfaces.length > 0) {
    for (const surface of state.surfaces) {
      if (!surface.texture_line) continue;
      const surfMacro: 'FLOOR' | 'WALL' = surface.type === 'FLOOR' ? 'FLOOR' : 'WALL';
      const fughe = surface.type === 'WALL_PART'
        ? (state.sub_answers_wall.fughe_residue ?? state.sub_answers_floor.fughe_residue)
        : state.sub_answers_floor.fughe_residue;
      const texResult = computeTextureCart(store, {
        line: surface.texture_line,
        style: surface.texture_style!,
        area_mq: surface.mq,
        macro: surfMacro,
        color_mode: surface.color_mode,
        color_primary: surface.color_primary,
        color_secondary: surface.color_secondary,
        lamine_pattern: surface.lamine_pattern,
        last_base_layer: lastBase,
        fughe_residue: fughe,
        env_id: effectiveAmbiente(state),
      });
      const colorLbl = surface.color_primary?.label ?? undefined;
      texResult.cart_lines.forEach(l => {
        const ln: CartLine = { ...l, color_label: colorLbl };
        all_lines.push(ln);
        if (l.section === 'texture') texProcLines.push(ln);
      });
      texResult.fees.forEach(f => all_fees.push(f));
      allTexAlerts.push(...texResult.hard_alerts);
      texArea += surface.mq;
    }
    primaryTexLine = (state.surfaces.find(s => s.texture_line)?.texture_line ?? state.texture_line ?? 'NATURAL') as TexLine;
  } else {
    // ── Backward compat — singola texture globale ──────────────────────────
    texArea = state.mq_pavimento + state.mq_pareti;
    const macro: 'FLOOR' | 'WALL' = state.mq_pavimento > 0 ? 'FLOOR' : 'WALL';
    const texResult = computeTextureCart(store, {
      line: state.texture_line!,
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
    texProcLines.push(...texResult.cart_lines.filter(l => l.section === 'texture'));
    texResult.fees.forEach(f => all_fees.push(f));
    allTexAlerts.push(...texResult.hard_alerts);
  }
  allTexAlerts.forEach(a => all_alerts.push({ code: 'TEX_ALERT', text: a, severity: 'hard' }));

  // ─── Protettivi ───────────────────────────────────────────────────────────
  const usoSup = deriveUsoSuperficie(state);
  let protStepDescriptions: ReturnType<typeof computeProtettiviCart>['step_descriptions'] = [];

  if (state.surfaces.length > 0 && state.protettivo) {
    if (state.protector_mode === 'COLOR') {
      // Per-surface: ogni superficie ha il proprio colore protettivo
      for (const surface of state.surfaces) {
        if (!surface.texture_line) continue;
        const protSelColor: import('../types/protettivi').ProtettivoSelection = {
          system: state.protettivo.system,
          finitura: state.protettivo.system === 'H2O' ? 'PROTEGGO_COLOR_OPACO' : 'OPACO',
          uso_superficie: usoSup,
          opaco_colorato: state.protettivo.system === 'S',
          colore_source: surface.protector_color?.type,
          colore_code: surface.protector_color?.code ?? surface.protector_color?.label,
          trasparente_finale: state.protettivo.trasparente_finale,
        };
        const protResult = computeProtettiviCart(store, protSelColor, surface.texture_line as TexLine, surface.mq, usoSup);
        protResult.cart_lines.forEach(l => {
          all_lines.push({ ...l, color_label: surface.protector_color?.label ?? undefined });
        });
        protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
        if (protStepDescriptions.length === 0) protStepDescriptions = protResult.step_descriptions;
      }
    } else {
      // TRASPARENTE: calcolo unico sull'area totale
      const protSel: import('../types/protettivi').ProtettivoSelection = {
        ...state.protettivo,
        finitura: state.finish_type === 'LUCIDO' ? 'LUCIDO' : (state.protettivo.finitura ?? 'OPACO'),
      };
      const protResult = computeProtettiviCart(store, protSel, primaryTexLine, texArea, usoSup);
      all_lines.push(...protResult.cart_lines);
      protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
      protStepDescriptions = protResult.step_descriptions;
    }
  } else if (state.protettivo) {
    // ── Backward compat — singolo protettivo globale ───────────────────────
    const protResult = computeProtettiviCart(store, state.protettivo, state.texture_line as TexLine, texArea, usoSup);
    all_lines.push(...protResult.cart_lines);
    protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
    protStepDescriptions = protResult.step_descriptions;
  }


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
  const procedure_texture: CartProcedureStep[] = texProcLines
    .map((line, i) => ({
      step_order: (i + 1) * 10,
      name: line.color_label ? `${line.descrizione} — ${line.color_label}` : line.descrizione,
      product_id: line.product_id ?? null,
      qty_total_kg: (line as CartLine & { qty_raw?: number }).qty_raw ?? null,
      unit: line.pack_unit ?? null,
      section: 'texture' as const,
      hard_alerts: i === 0 ? allTexAlerts : [],
    }));

  // ─── Costruisci procedure protettivi ──────────────────────────────────────
  const procedure_protettivi: CartProcedureStep[] = protStepDescriptions.map(s => ({
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

  // Tracce su pavimento (F_TILE_TRACES) — iniettate con step_order negativo per venire prime
  if (state.supporto_floor === 'F_TILE_TRACES') {
    const sub = state.sub_answers_floor;
    const mq = sub.mq_tracce ?? 0;
    const spessore = sub.spessore_mm_tracce ?? 0;
    if (mq > 0 && spessore > 0) {
      const kgMasEp = ((mq * spessore) / 1000) * 1800;
      prepFloor.push({ name: `Massetto Epossidico — riempimento tracce (${kgMasEp.toFixed(1)} kg)`, step_order: -20 });
    }
  }

  // Tracce su parete (W_TILE_TRACES)
  if (state.supporto_wall === 'W_TILE_TRACES') {
    const sub = state.sub_answers_wall;
    const mq = sub.mq_tracce ?? 0;
    const spessore = sub.spessore_mm_tracce ?? 0;
    if (mq > 0 && spessore > 0) {
      if (sub.tracce_riempimento === 'RAS_FONDO_FINO') {
        const kgRas = mq * spessore * 1.6;
        prepWall.push({ name: `Rasante Fondo Fino — riempimento tracce (${kgRas.toFixed(1)} kg)`, step_order: -20 });
      } else if (sub.tracce_riempimento === 'MALTA_ANTIRITIRO') {
        prepWall.push({ name: 'NOTA TECNICA: Malta antiritiro strutturale (fornitura a parte)', step_order: -20 });
      }
      const kgPr = mq * 0.15;
      prepWall.push({ name: `Primer SW 150 g/m² — primerizzazione tracce (${kgPr.toFixed(2)} kg)`, step_order: -10 });
    }
  }

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

// ─── Piastrella con tracce — helper push singola riga ────────────────────────
function pushLine(
  store: DataStore,
  lines: CartLine[],
  product_id: string,
  kgTotal: number,
  section: CartLine['section'],
): void {
  if (kgTotal <= 0) return;
  const skus = store.packagingSku.filter(p => p.product_id === product_id);
  if (skus.length === 0) return;
  const best = skus.sort((a, b) => (b.pack_size ?? 0) - (a.pack_size ?? 0))[0];
  const qty = Math.ceil(kgTotal / (best.pack_size ?? 1));
  const price = store.listino.find(l => l.sku_id === best.sku_id)?.prezzo_listino ?? 0;
  lines.push({
    sku_id: best.sku_id,
    descrizione: best.descrizione_sku,
    qty,
    prezzo_unitario: price,
    totale: qty * price,
    product_id,
    section,
    qty_raw: kgTotal,
    pack_size: best.pack_size,
    pack_unit: best.pack_unit,
  });
}

/**
 * Calcola le righe extra per i supporti "piastrella con tracce":
 *  - F_TILE_TRACES (pavimento): massetto epossidico volumetrico
 *  - W_TILE_TRACES (parete):  rasante fondo fino (se RAS_FONDO_FINO) + primer SW 150 g/m²
 * Queste righe vengono inserite PRIMA delle procedure standard nel carrello.
 */
export function computeTracceLines(store: DataStore, state: WizardState): CartLine[] {
  const lines: CartLine[] = [];

  // ── Pavimento (F_TILE_TRACES) — massetto epossidico ──────────────────────
  if (state.supporto_floor === 'F_TILE_TRACES') {
    const sub = state.sub_answers_floor;
    const mq = sub.mq_tracce ?? 0;
    const spessore = sub.spessore_mm_tracce ?? 0;
    if (mq > 0 && spessore > 0) {
      const kgMasEp = (mq * spessore / 1000) * 1800;
      pushLine(store, lines, 'MAS_EP', kgMasEp, 'fondo');
    }
  }

  // ── Parete (W_TILE_TRACES) — riempimento + primer ─────────────────────────
  if (state.supporto_wall === 'W_TILE_TRACES') {
    const sub = state.sub_answers_wall;
    const mq = sub.mq_tracce ?? 0;
    const spessore = sub.spessore_mm_tracce ?? 0;
    const riempimento = sub.tracce_riempimento;
    if (mq > 0 && spessore > 0) {
      if (riempimento === 'RAS_FONDO_FINO') {
        // kg = mq × spessore_mm × 1,6  (consumo rasante fondo fino)
        const kgRas = mq * spessore * 1.6;
        pushLine(store, lines, 'RAS_FONDO_FINO', kgRas, 'fondo');
      }
      // malta antiritiro: nessun prodotto, solo nota tecnica in stratigrafia
      // Primer SW 150 g/m² obbligatorio su area tracce indipendentemente dal riempimento
      pushLine(store, lines, 'PR_SW', mq * 0.150, 'fondo');
    }
  }

  return lines;
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
    // Righe con colori diversi NON vengono accorpate anche se stesso SKU
    const key = `${line.sku_id}::${line.color_label ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty += line.qty;
      existing.totale += line.totale;
      if (line.qty_raw !== undefined) {
        existing.qty_raw = (existing.qty_raw ?? 0) + line.qty_raw;
      }
    } else {
      map.set(key, { ...line });
    }
  }
  return Array.from(map.values());
}
