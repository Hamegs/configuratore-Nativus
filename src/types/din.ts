export interface DinInput {
  input_id: string;
  label: string;
  driver: string;
  unit: string;
  default: string;
  required: string;
  applies_if: string;
}

export interface DinOrderRule {
  rule_id: string;
  applies_if: string;
  product_id: string;
  calc: string;
  notes: string;
}

export interface DinInputValues {
  DIN_DOCCE_PZ: number;
  DIN_BBCORNER_IN_PZ: number;
  DIN_BBCORNER_OUT_PZ: number;
  DIN_BBPASS_PZ: number;
  DIN_BBDRAIN_PZ: number;
  DIN_BBTAPE_ML: number;
  DIN_NORPHEN_ML: number;
}
