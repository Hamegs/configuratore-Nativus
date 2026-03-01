export interface ProtettivoOpParam {
  protettivo: string;
  line_id: string;
  passaggi: string;
  consumo_g_m2_per_passaggio: string;
  diluizione_percent: string;
  pot_life_min: string;
  t_min_h: string;
  t_max_h: string;
  note: string;
}

export interface ProtettivoRule {
  rule_id: string;
  line_id: string;
  style_id: string;
  mode: string;
  protettivo_default_sku_id: string;
  protettivo_opaco_sku_id: string;
  protettivo_lucido_sku_id: string;
  allowed_sku_ids_csv: string;
  note: string;
}

export interface ProtettivoNota {
  voce: string;
  dato: string;
}

export interface ProtettivoDataset {
  op_params: ProtettivoOpParam[];
  rules: ProtettivoRule[];
  note_operative: ProtettivoNota[];
}

export interface ProtettivoSelection {
  system: 'H2O' | 'S';
  finitura: 'OPACO' | 'LUCIDO' | 'CERA_LUCIDA' | 'PROTEGGO_COLOR_OPACO';
  uso_superficie: 'PAVIMENTO' | 'PARETE_FUORI_BAGNO' | 'BAGNO_DOCCIA';
  opaco_colorato: boolean;
  colore_source?: string;
  colore_code?: string;
  trasparente_finale?: 'OPACO_H2O' | 'LUCIDO_H2O';
}
