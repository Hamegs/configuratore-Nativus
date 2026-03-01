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

  if (matches.length > 1) {
    const ids = matches.map(m => m.rule_id);
    throw new DataError(
      'AMBIGUOUS_RULE',
      `Trovate ${matches.length} regole ambigue per: ${JSON.stringify(input)} → [${ids.join(', ')}]`,
      { input, rule_ids: ids },
    );
  }

  return matches[0];
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

  function mapHumidity(v: unknown): string | null {
    if (v === 'NONE') return 'LE3';
    if (v === 'LOW')  return '3_8';
    if (v === 'HIGH') return 'GT8_OR_ISSUE';
    return null;
  }

  function mapCracks(crepe: unknown): string | null {
    if (crepe === true)  return 'YES';
    if (crepe === false) return 'NO';
    return null;
  }

  return {
    support_id,
    env_id,
    din: isDin,
    zona_doccia: isShower,
    humidity_band: mapHumidity(sub.humidity_band),
    cohesion: sub.cohesion === true ? 'SFAR' : sub.cohesion === false ? 'SOLID' : typeof sub.cohesion === 'string' ? sub.cohesion : null,
    cracks: mapCracks(sub.crepe),
    tile_bedding: sub.tile_bedding ?? null,
    hollow: sub.hollow ?? null,
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
