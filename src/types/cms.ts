export interface EnvironmentConfig {
  id: string;
  name: string;
  media_ids: string[];
}

export interface SupportConfig {
  id: string;
  name: string;
  description: string;
  media_ids: string[];
}

export interface Tool {
  id: string;
  name: string;
  icon_media_id: string;
}

export interface ApplicationStep {
  id: string;
  product_id: string;
  order: number;
  step_name: string;
  consumption: string;
  drying_time: string;
  overcoating_time: string;
  tool_ids: string[];
  cleaning_method: string;
  technical_notes: string;
}

export type StratigraphyPhaseLabel = 'A' | 'B' | 'C';

export interface StratigraphyPhase {
  id: string;
  phase: StratigraphyPhaseLabel;
  label: string;
  product_ids: string[];
}

export interface StratigraphyManual {
  id: string;
  name: string;
  support_id: string;
  texture_system: string;
  environment_type: string;
  media_ids: string[];
  phases: StratigraphyPhase[];
}

export interface StratigraphyVersion {
  id: string;
  manual_id: string;
  version: string;
  snapshot: StratigraphyManual;
  createdAt: string;
  createdBy: string;
  notes: string;
}

export type OperationalAudience = 'APPLICATORE' | 'DISTRIBUTORE' | 'PROGETTISTA';

export type OperationalField =
  | 'material'
  | 'consumption'
  | 'application_times'
  | 'tools'
  | 'cleaning'
  | 'technical_notes'
  | 'pricing';

export interface OperationalSheetTemplate {
  id: string;
  audience: OperationalAudience;
  visible_fields: OperationalField[];
}
