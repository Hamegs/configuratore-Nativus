export interface DecisionRule {
  rule_id: string;
  support_id: string;
  env_id: string;
  din: string;
  zona_doccia: string;
  humidity_band: string | null;
  cohesion: string | null;
  cracks: string | null;
  tile_bedding: string | null;
  hollow: string | null;
}

export interface DecisionInput {
  support_id: string;
  env_id: string;
  din: boolean;
  zona_doccia: boolean;
  humidity_band?: string;
  cohesion?: string;
  cracks?: string;
  tile_bedding?: string;
  hollow?: string;
}

export type MatchResult =
  | { type: 'match'; rule_id: string; rule: DecisionRule }
  | { type: 'no_match'; input: DecisionInput }
  | { type: 'ambiguous'; rule_ids: string[]; input: DecisionInput };

export interface StepMapEntry {
  rule_id: string;
  step_order: number;
  step_id: string;
}
