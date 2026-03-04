import type { DataStore } from '../utils/data-loader';
import type { CartLine, CartFee, CartHardNote, CartSummary, CartProcedureStep, RawCartLine } from '../types/cart';
import type { TextureInput } from './texture-rules';
import { packageLines, consolidateRawGlobal } from './raw-cart-engine';
import type { WizardState } from '../types/wizard-state';
import { matchDecisionTable, buildRuleInputFromWizard, resolveCompRule } from './decision-table';
import { resolveStepsForRule } from './step-resolver';
import { computeTextureCart } from './texture-rules';
import { computeProtettiviCart } from './protettivi-rules';
import { computeDinCart, buildDinInputsFromWizard } from './din-calculator';
import { DataError } from './errors';
import { effectiveAmbiente, isEffectiveShower } from './effective-ambiente';
import { getCommercialName } from '../utils/product-names';
import { applyTextureTechnicalModifiers } from './texture-technical-modifiers';
import { applyPreparationUpgrade } from './preparation-upgrade';

export interface CartResult {
  summary: CartSummary;
  raw_lines: RawCartLine[];
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
  const all_raw_lines: RawCartLine[] = [];

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
  const tracceLines = computeTracceLines(store, state);
  all_lines.push(...tracceLines);
  // Collect tracce raw (section fondo — excluded from end-scan which skips fondo)
  tracceLines.filter(l => l.product_id).forEach(l => {
    all_raw_lines.push({
      environment_id: '__room__',
      product_id: l.product_id!,
      qty_raw: l.qty_raw ?? l.qty * (l.pack_size ?? 1),
      section: l.section,
      pack_unit: l.pack_unit ?? 'kg',
      descrizione: l.descrizione,
    });
  });

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
        const floorTexLine = (state.surfaces.find(s => s.type === 'FLOOR')?.texture_line ?? state.texture_line) as TexLine | null;
        if (floorTexLine) {
          procedure_floor = {
            ...procedure_floor,
            steps: applyTextureTechnicalModifiers(store, procedure_floor.steps, floorTexLine, state.mq_pavimento),
          };
        }
        procedure_floor = {
          ...procedure_floor,
          steps: applyPreparationUpgrade(store, procedure_floor.steps, state, state.mq_pavimento),
        };
        procedure_floor.steps.forEach(step => {
          if (step.product_id && (step.qty_total ?? 0) > 0) {
            all_raw_lines.push({
              environment_id: '__room__',
              product_id: step.product_id,
              qty_raw: step.qty_total!,
              section: 'fondo',
              pack_unit: step.unit ?? 'kg',
              descrizione: getCommercialName(step.product_id) ?? step.product_id,
            });
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
        const wallTexLine = (state.surfaces.find(s => s.type === 'WALL_PART')?.texture_line ?? state.texture_line) as TexLine | null;
        if (wallTexLine) {
          procedure_wall = {
            ...procedure_wall,
            steps: applyTextureTechnicalModifiers(store, procedure_wall.steps, wallTexLine, state.mq_pareti),
          };
        }
        procedure_wall = {
          ...procedure_wall,
          steps: applyPreparationUpgrade(store, procedure_wall.steps, state, state.mq_pareti),
        };
        procedure_wall.steps.forEach(step => {
          if (step.product_id && (step.qty_total ?? 0) > 0) {
            all_raw_lines.push({
              environment_id: '__room__',
              product_id: step.product_id,
              qty_raw: step.qty_total!,
              section: 'fondo',
              pack_unit: step.unit ?? 'kg',
              descrizione: getCommercialName(step.product_id) ?? step.product_id,
            });
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

  // ─── Section E/F: Hollow-tile + Parquet compensation raw lines ───────────
  // Must be added BEFORE fondoConsolidated so they merge with other fondo products.
  const EP_DENSITY_KG_PER_M2_MM = 1.8;  // 1800 kg/m³ epoxy screed density
  const AS_DENSITY_KG_PER_M2_MM = 1.8;  // 1800 kg/m³ autolivellante density

  const sub = state.sub_answers_floor;

  // Section E — Hollow-tile compensation
  if (sub.hollow === 'SOME' && (sub.hollow_area_mq ?? 0) > 0 && (sub.tile_thickness_mm ?? 0) > 0) {
    const qty_raw = (sub.hollow_area_mq as number) * (sub.tile_thickness_mm as number) * EP_DENSITY_KG_PER_M2_MM;
    all_raw_lines.push({
      environment_id: '__room__', product_id: 'MAS_EP',
      qty_raw, section: 'fondo', pack_unit: 'kg',
      descrizione: 'Massetto Epossidico — compensazione vuoti parziali',
    });
  }

  if (sub.hollow === 'ALL' && (sub.tile_thickness_mm ?? 0) > 0) {
    const compensArea = state.mq_pavimento;
    const productId = sub.hollow_comp === 'AS' ? 'AUTO_AS' : 'MAS_EP';
    const density = sub.hollow_comp === 'AS' ? AS_DENSITY_KG_PER_M2_MM : EP_DENSITY_KG_PER_M2_MM;
    const label = sub.hollow_comp === 'AS' ? 'Autolivellante AS — compensazione quota' : 'Massetto Epossidico — compensazione quota';
    const qty_raw = compensArea * (sub.tile_thickness_mm as number) * density;
    all_raw_lines.push({
      environment_id: '__room__', product_id: productId,
      qty_raw, section: 'fondo', pack_unit: 'kg',
      descrizione: label,
    });
  }

  // Section F — Parquet removal compensation
  if (sub.parquet_comp && (sub.parquet_area_mq ?? 0) > 0 && (sub.parquet_thickness_mm ?? 0) > 0) {
    const productId = sub.parquet_comp === 'AS' ? 'AUTO_AS' : 'MAS_EP';
    const density = sub.parquet_comp === 'AS' ? AS_DENSITY_KG_PER_M2_MM : EP_DENSITY_KG_PER_M2_MM;
    const label = sub.parquet_comp === 'AS' ? 'Autolivellante AS — compensazione quota parquet' : 'Massetto Epossidico — compensazione quota parquet';
    const qty_raw = (sub.parquet_area_mq as number) * (sub.parquet_thickness_mm as number) * density;
    all_raw_lines.push({
      environment_id: '__room__', product_id: productId,
      qty_raw, section: 'fondo', pack_unit: 'kg',
      descrizione: label,
    });
  }

  // ─── Package fondo (floor + wall) — unico punto Math.ceil per preparazione ─
  // Consolidate first so identical products (e.g. RETE_160 on floor + wall) are
  // summed before Math.ceil is applied — avoids over-packaging (e.g. 30m²+20m²
  // being treated as 1+1 packs instead of the optimal Math.ceil(50/50)=1 pack).
  const fondoConsolidated = consolidateRawGlobal(all_raw_lines.filter(l => l.section === 'fondo'));
  all_lines.push(...packageLines(store, fondoConsolidated, 'CONFEZIONI_GRANDI'));

  // ─── Texture ─────────────────────────────────────────────────────────────
  // Modello multi-superficie: calcola per ogni Surface; fallback singola texture se surfaces è vuoto.
  const lastBase = detectLastBaseLayer(procedure_floor, procedure_wall);
  const allTexAlerts: string[] = [];
  const texProcLines: CartLine[] = [];  // raccoglie le righe texture per procedure_texture

  let texArea = 0;
  let primaryTexLine: TexLine = (state.texture_line ?? 'NATURAL') as TexLine;

  const wallSurfaces = state.surfaces.filter(s => s.type === 'WALL_PART');

  if (state.surfaces.length > 0) {
    for (const surface of state.surfaces) {
      if (!surface.texture_line) continue;
      const surfMacro: 'FLOOR' | 'WALL' = surface.type === 'FLOOR' ? 'FLOOR' : 'WALL';
      const fughe = surface.type === 'WALL_PART'
        ? (state.sub_answers_wall.fughe_residue ?? state.sub_answers_floor.fughe_residue)
        : state.sub_answers_floor.fughe_residue;
      const zone_label = surface.type === 'FLOOR'
        ? 'Pavimento'
        : wallSurfaces.length === 1
          ? 'Parete'
          : `Parete ${wallSurfaces.indexOf(surface) + 1}`;
      const textureInput: TextureInput = {
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
        zone_label,
      };
      const texResult = computeTextureCart(store, textureInput);
      texResult.cart_lines.forEach(l => {
        all_lines.push(l);
        if (l.section === 'texture') texProcLines.push(l);
      });
      texResult.fees.forEach(f => all_fees.push(f));
      allTexAlerts.push(...texResult.hard_alerts);
      texArea += surface.mq;
      all_raw_lines.push({
        environment_id: '__room__',
        product_id: surface.texture_line,
        qty_raw: surface.mq,
        section: 'texture',
        destination: zone_label,
        color_label: surface.color_primary?.label ?? undefined,
        descrizione: `${surface.texture_line} — ${surface.color_primary?.label ?? ''} — ${zone_label}`,
        _texture_input: textureInput,
      });
    }
    primaryTexLine = (state.surfaces.find(s => s.texture_line)?.texture_line ?? state.texture_line ?? 'NATURAL') as TexLine;
  } else {
    // ── Backward compat — singola texture globale ──────────────────────────
    texArea = state.mq_pavimento + state.mq_pareti;
    const macro: 'FLOOR' | 'WALL' = state.mq_pavimento > 0 ? 'FLOOR' : 'WALL';
    const textureInputGlobal: TextureInput = {
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
    };
    const texResult = computeTextureCart(store, textureInputGlobal);
    all_lines.push(...texResult.cart_lines);
    texProcLines.push(...texResult.cart_lines.filter(l => l.section === 'texture'));
    texResult.fees.forEach(f => all_fees.push(f));
    allTexAlerts.push(...texResult.hard_alerts);
    all_raw_lines.push({
      environment_id: '__room__',
      product_id: state.texture_line!,
      qty_raw: texArea,
      section: 'texture',
      color_label: state.color_primary?.label ?? undefined,
      descrizione: `${state.texture_line} — ${state.color_primary?.label ?? ''}`,
      _texture_input: textureInputGlobal,
    });
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
        const surfZone = surface.type === 'FLOOR'
          ? 'Pavimento'
          : wallSurfaces.length === 1
            ? 'Parete'
            : `Parete ${wallSurfaces.indexOf(surface) + 1}`;
        const protSelColor: import('../types/protettivi').ProtettivoSelection = {
          ...state.protettivo,
          finitura: state.protettivo.system === 'H2O' ? 'PROTEGGO_COLOR_OPACO' : state.protettivo.finitura,
          uso_superficie: usoSup,
          opaco_colorato: true,
          colore_source: surface.protector_color?.type,
          colore_code: surface.protector_color?.code ?? surface.protector_color?.label ?? state.protettivo.colore_code,
        };
        const protResult = computeProtettiviCart(store, protSelColor, surface.texture_line as TexLine, surface.mq, usoSup, surfZone);
        all_lines.push(...protResult.cart_lines);
        protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
        if (protStepDescriptions.length === 0) protStepDescriptions = protResult.step_descriptions;
      }
    } else {
      // TRASPARENTE: calcolo unico sull'area totale
      const protSel: import('../types/protettivi').ProtettivoSelection = {
        ...state.protettivo,
        finitura: state.finish_type === 'LUCIDO'
        ? 'LUCIDO'
        : (state.protettivo.finitura === 'OPACO' || state.protettivo.finitura === 'LUCIDO'
            ? state.protettivo.finitura
            : 'OPACO'),
      };
      const protResult = computeProtettiviCart(store, protSel, primaryTexLine, texArea, usoSup);
      all_lines.push(...protResult.cart_lines);
      protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
      protStepDescriptions = protResult.step_descriptions;
    }
  } else if (state.protettivo) {
    // ── Section D: Split protettivi floor/wall OR backward compat global ──────
    if (state.split_protettivi && state.mq_pavimento > 0 && (state.mq_pareti ?? 0) > 0) {
      const protFloor = state.protettivo_floor ?? state.protettivo;
      const protWall  = state.protettivo_wall  ?? state.protettivo;
      const isSame = protFloor.system === protWall.system && protFloor.finitura === protWall.finitura;

      if (isSame) {
        // Same system: merge areas into a single calculation
        const protResult = computeProtettiviCart(store, protFloor, state.texture_line as TexLine, texArea, usoSup);
        all_lines.push(...protResult.cart_lines);
        protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
        protStepDescriptions = protResult.step_descriptions;
      } else {
        // Different systems: two independent calculations
        const floorResult = computeProtettiviCart(store, protFloor, state.texture_line as TexLine, state.mq_pavimento, usoSup, 'Pavimento');
        all_lines.push(...floorResult.cart_lines);
        floorResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
        if (protStepDescriptions.length === 0) protStepDescriptions = floorResult.step_descriptions;

        const wallResult = computeProtettiviCart(store, protWall, state.texture_line as TexLine, state.mq_pareti ?? 0, 'PARETE_FUORI_BAGNO', 'Pareti');
        all_lines.push(...wallResult.cart_lines);
        wallResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
      }
    } else {
      // Single protettivo for all surfaces (original behaviour)
      const protResult = computeProtettiviCart(store, state.protettivo, state.texture_line as TexLine, texArea, usoSup);
      all_lines.push(...protResult.cart_lines);
      protResult.hard_alerts.forEach(a => all_alerts.push({ code: 'PROT_ALERT', text: a, severity: 'hard' }));
      protStepDescriptions = protResult.step_descriptions;
    }
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
  const docciaLines = buildDocciaPiattoLines(store, state);
  all_lines.push(...docciaLines);
  // Collect doccia raw (section fondo — excluded from end-scan)
  docciaLines.filter(l => l.product_id).forEach(l => {
    all_raw_lines.push({
      environment_id: '__room__',
      product_id: l.product_id!,
      qty_raw: l.qty_raw ?? l.qty * (l.pack_size ?? 1),
      section: l.section,
      pack_unit: l.pack_unit ?? 'kg',
      descrizione: l.descrizione,
    });
  });

  // ─── Consolidamento righe duplicate (stesso sku_id nella stessa section) ──
  const consolidated = consolidateLines(all_lines);

  const total_lines = consolidated.reduce((acc, l) => acc + l.totale, 0);
  const total_fees = all_fees.reduce((acc, f) => acc + f.amount * f.qty, 0);

  // ─── Raccogli raw lines non-texture da all_lines ───────────────────────────
  // Le raw texture sono già state aggiunte inline nel loop superfici.
  // Per fondo/protettivi/din/speciale usiamo qty_raw già impostato in each CartLine.
  console.log('[computeFullCart] RAW texture lines collected:', all_raw_lines.filter(l => l.section === 'texture').length);
  for (const line of all_lines) {
    // fondo già raccolto esplicitamente dai procedure steps (floor/wall); skip per evitare duplicati
    if (line.section === 'texture' || line.section === 'fondo' || !line.product_id) continue;
    const qty_raw = line.qty_raw ?? line.qty * (line.pack_size ?? 1);
    all_raw_lines.push({
      environment_id: '__room__',
      product_id: line.product_id,
      qty_raw,
      section: line.section,
      pack_unit: line.pack_unit ?? 'kg',
      descrizione: line.descrizione,
    });
  }
  console.log('[computeFullCart] RAW lines total:', all_raw_lines.length, all_raw_lines.map(l => `${l.section}:${l.product_id}:${l.qty_raw.toFixed(2)}`));

  // ─── Costruisci procedure texture ─────────────────────────────────────────
  const procedure_texture: CartProcedureStep[] = texProcLines
    .map((line, i) => ({
      step_order: (i + 1) * 10,
      name: line.descrizione,
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
    raw_lines: all_raw_lines,
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
        const floorTexLineSchedule = state.texture_line;
        const modifiedProcFloor = floorTexLineSchedule
          ? { ...proc, steps: applyTextureTechnicalModifiers(store, proc.steps, floorTexLineSchedule, 1) }
          : proc;
        const upgradedProcFloor = {
          ...modifiedProcFloor,
          steps: applyPreparationUpgrade(store, modifiedProcFloor.steps, state, 1),
        };
        upgradedProcFloor.steps.forEach(s => {
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
        const wallTexLineSchedule = state.texture_line;
        const modifiedProcWall = wallTexLineSchedule
          ? { ...proc, steps: applyTextureTechnicalModifiers(store, proc.steps, wallTexLineSchedule, 1) }
          : proc;
        const upgradedProcWall = {
          ...modifiedProcWall,
          steps: applyPreparationUpgrade(store, modifiedProcWall.steps, state, 1),
        };
        upgradedProcWall.steps.forEach(s => {
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
  const raw: RawCartLine = {
    environment_id: '__room__',
    product_id,
    qty_raw: kgTotal,
    section,
    pack_unit: 'kg',
    descrizione: getCommercialName(product_id) ?? product_id,
  };
  lines.push(...packageLines(store, [raw], 'CONFEZIONI_GRANDI'));
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
  const rawLines: RawCartLine[] = proc.steps
    .filter(step => step.product_id && (step.qty_total ?? 0) > 0)
    .map(step => ({
      environment_id: '__room__',
      product_id: step.product_id!,
      qty_raw: step.qty_total!,
      section: 'fondo' as CartLine['section'],
      pack_unit: step.unit ?? 'kg',
      descrizione: getCommercialName(step.product_id!) ?? step.product_id!,
    }));
  return packageLines(store, rawLines, 'CONFEZIONI_GRANDI');
}

function stripZoneLabel(desc: string): string {
  const parts = desc.split(' — ');
  const last = parts[parts.length - 1];
  if (parts.length > 1 && (last === 'Pavimento' || last.startsWith('Parete'))) {
    return parts.slice(0, -1).join(' — ');
  }
  return desc;
}

function consolidateLines(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of lines) {
    const displayDesc = (line.section === 'texture' || line.section === 'protettivi')
      ? stripZoneLabel(line.descrizione)
      : line.descrizione;
    const key = `${line.sku_id}::${displayDesc}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty += line.qty;
      existing.totale += line.totale;
      if (line.qty_raw !== undefined) {
        existing.qty_raw = (existing.qty_raw ?? 0) + line.qty_raw;
      }
    } else {
      map.set(key, { ...line, descrizione: displayDesc });
    }
  }
  return Array.from(map.values());
}
