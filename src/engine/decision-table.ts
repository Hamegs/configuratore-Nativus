import type { DecisionRule } from '../types/regole';
import type { WizardState } from '../types/wizard-state';
import { DataError } from './errors';
import { effectiveAmbiente, isEffectiveDin, isEffectiveShower } from './effective-ambiente';

export interface RuleMatchInput {
  support_id: string;
  env_id: string;
  din: boolean;
  zona_doccia: boolean;
  humidity_band?: string | null;
  cohesion?: string | null;
  cracks?: string | null;
  tile_bedding?: string | null;
  hollow?: string | null;
}

type WildcardableField = string | null | undefined;

function matchField(ruleVal: WildcardableField, inputVal: WildcardableField): boolean {
  if (ruleVal === null || ruleVal === '' || ruleVal === undefined) return true;
  if (inputVal === null || inputVal === undefined || inputVal === '') return ruleVal === null || ruleVal === '';
  return ruleVal === inputVal;
}

function matchBoolField(ruleVal: string, inputVal: boolean): boolean {
  if (ruleVal === '' || ruleVal === null) return true;
  return ruleVal === (inputVal ? '1' : '0');
}

// Specificity = number of non-wildcard discriminating fields in a rule.
// Used to resolve ties when multiple rules match: the most specific wins.
function ruleSpecificity(rule: DecisionRule): number {
  return [rule.humidity_band, rule.cohesion, rule.cracks, rule.tile_bedding, rule.hollow]
    .filter(v => v !== null && v !== '' && v !== undefined)
    .length;
}

export function matchDecisionTable(
  table: DecisionRule[],
  input: RuleMatchInput,
): DecisionRule {
  const matches = table.filter(rule => {
    if (rule.support_id !== input.support_id) return false;
    if (rule.env_id !== input.env_id) return false;
    if (!matchBoolField(rule.din, input.din)) return false;
    if (!matchBoolField(rule.zona_doccia, input.zona_doccia)) return false;
    if (!matchField(rule.humidity_band, input.humidity_band)) return false;
    if (!matchField(rule.cohesion, input.cohesion)) return false;
    if (!matchField(rule.cracks, input.cracks)) return false;
    if (!matchField(rule.tile_bedding, input.tile_bedding)) return false;
    if (!matchField(rule.hollow, input.hollow)) return false;
    return true;
  });

  if (matches.length === 0) {
    throw new DataError(
      'NO_RULE_MATCH',
      `Nessuna regola trovata per: ${JSON.stringify(input)}`,
      { input },
    );
  }

  if (matches.length === 1) return matches[0];

  // Multiple matches: prefer the most specific rule (most non-wildcard fields).
  // This handles cases where a specific rule (e.g. tile_bedding=COLLA) coexists
  // with a wildcard fallback (tile_bedding=null).
  const maxSpec = Math.max(...matches.map(ruleSpecificity));
  const topMatches = matches.filter(r => ruleSpecificity(r) === maxSpec);

  if (topMatches.length === 1) return topMatches[0];

  const ids = topMatches.map(m => m.rule_id);
  throw new DataError(
    'AMBIGUOUS_RULE',
    `Trovate ${topMatches.length} regole ambigue per: ${JSON.stringify(input)} → [${ids.join(', ')}]`,
    { input, rule_ids: ids },
  );
}

export function buildRuleInputFromWizard(
  state: WizardState,
  macro: 'FLOOR' | 'WALL',
): RuleMatchInput | null {
  const support_id = macro === 'FLOOR' ? state.supporto_floor : state.supporto_wall;
  if (!support_id) return null;
  if (!state.ambiente) return null;

  const mq = macro === 'FLOOR' ? state.mq_pavimento : state.mq_pareti;
  if (mq <= 0) return null;

  const sub = macro === 'FLOOR' ? state.sub_answers_floor : state.sub_answers_wall;

  const isDin = isEffectiveDin(state);
  const isShower = isEffectiveShower(state);
  const env_id = effectiveAmbiente(state);

  // humidity_band is stored as the DT-native value (LE3, 3_8, GT8_OR_ISSUE, LE8, GT8_OR_NOBARR).
  // No mapping needed — the sub-question options are defined with DT values directly.
  const humidity_band = (typeof sub.humidity_band === 'string' && sub.humidity_band !== '')
    ? sub.humidity_band
    : null;

  // cohesion: boolean → SFAR/SOLID for standard supports;
  // string pass-through for supports using named values (PERFETTO, RETTIFICA, LEV_OK, LEV_NOK, etc.)
  const cohesion = sub.cohesion === true
    ? 'SFAR'
    : sub.cohesion === false
    ? 'SOLID'
    : typeof sub.cohesion === 'string' && sub.cohesion !== ''
    ? sub.cohesion
    : null;

  // crepe: boolean → YES/NO
  const cracks = sub.crepe === true ? 'YES' : sub.crepe === false ? 'NO' : null;

  return {
    support_id,
    env_id,
    din: isDin,
    zona_doccia: isShower,
    humidity_band,
    cohesion,
    cracks,
    tile_bedding: (typeof sub.tile_bedding === 'string' && sub.tile_bedding !== '') ? sub.tile_bedding : null,
    hollow: (typeof sub.hollow === 'string' && sub.hollow !== '') ? sub.hollow : null,
  };
}

// Special case: F_COMP needs comp_type sub-answer to pick AS vs EP rule directly
export function resolveCompRule(
  table: DecisionRule[],
  env_id: string,
  comp_type: 'AS' | 'EP',
  prefix: 'F_COMP' | 'PAR' = 'F_COMP',
): DecisionRule {
  const rule_id = prefix === 'PAR'
    ? (comp_type === 'AS' ? 'F_PAR_AS_ORD' : 'F_PAR_EP_ORD')
    : (comp_type === 'AS' ? 'F_COMP_AS' : 'F_COMP_EP');
  const rule = table.find(r => r.rule_id === rule_id);
  if (!rule) {
    throw new DataError('NO_COMP_RULE', `Regola ${rule_id} non trovata in decision table`, { rule_id });
  }
  return rule;
}
