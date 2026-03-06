/**
 * CMS layer — media and documentation annotations on top of engine data.
 * The engine (decision-table, step-library, prodotti, etc.) remains the
 * single source of truth for system logic, products and quantities.
 * The CMS only manages: images, icons, manuals and documentation.
 */

/** Attach images to an environment defined in ambienti.json */
export interface EnvironmentMediaConfig {
  environment_id: string;
  media_ids: string[];
}

/** Attach images / references to a support defined in supporti.json */
export interface SupportMediaConfig {
  support_id: string;
  media_ids: string[];
}

/**
 * Attach stratigraphy diagram images to a support × system × environment
 * combination already computed by the engine.
 */
export interface StratigraphyMediaConfig {
  id: string;
  support_id: string;
  system_name: string;
  environment_type: string;
  media_ids: string[];
}

/**
 * Manual enrichment for an existing step_id from step-library.json.
 * Adds tool references, cleaning info and technical notes.
 */
export interface ApplicationStepManual {
  step_id: string;
  tool_ids: string[];
  cleaning_method: string;
  technical_notes: string;
  reference_images: string[];
}

export interface Tool {
  id: string;
  name: string;
  icon_media_id: string;
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
