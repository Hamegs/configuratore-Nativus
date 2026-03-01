export type AmbienteId = 'ORD' | 'BAG' | 'DOC' | 'DIN';
export type WizardVisibleAmbiente = 'ORD' | 'BAG';
export type MacroId = 'FLOOR' | 'WALL';
export type StepTypeId = 'MECH' | 'PRIM' | 'REPR' | 'WPRO' | 'STRC' | 'ARMR' | 'ADDV' | 'WAIT' | 'GATE' | 'NOTE';
export type TextureLineId = 'NATURAL' | 'SENSE' | 'DEKORA' | 'LAMINE' | 'CORLITE' | 'MATERIAL';
export type TextureStyleId = 'CHROMO' | 'ALIZEE_EVIDENCE_4' | 'COR_CHROMO' | 'COR_EVIDENCE';
export type ProtectionSystem = 'H2O' | 'S';
export type Mercato = 'IT' | 'DIN';
export type ColorMode = 'COLORABILE' | 'CUSTOM_PRECOLORED' | 'PATTERN' | 'NEUTRO' | 'CUSTOM_FEE0';

export interface Ambiente {
  env_id: AmbienteId;
  name: string;
}

export interface Macro {
  macro_id: MacroId;
  name: string;
}

export interface StepType {
  step_type_id: StepTypeId;
  name: string;
}
