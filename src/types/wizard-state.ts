import type { AmbienteId, TextureLineId, TextureStyleId, ProtectionSystem, Mercato, ColorMode } from './enums';
import type { ColorSelection } from './texture';
import type { DinInputValues } from './din';
import type { StepDefinition } from './step';
import type { BlockingError } from '../engine/errors';
import type { ProtettivoSelection } from './protettivi';

export interface SubAnswers {
  sfarinante?: boolean;
  crepe?: boolean;
  crepe_ml?: number;
  humidity_band?: string;
  cohesion?: string | boolean;
  tile_bedding?: string;
  hollow?: string;
  piatto_doccia?: string;
  fughe_residue?: string;
  parquet_comp?: 'AS' | 'EP';
}

export interface WizardState {
  currentStep: number;
  maxReachedStep: number;

  // Step 1 — Ambiente
  ambiente: AmbienteId | null;
  mercato: Mercato;
  mq_pavimento: number;
  mq_pareti: number;

  // BAG — flags doccia e mercato tedesco
  presenza_doccia: boolean;
  mercato_tedesco: boolean;

  // BAG — dettagli zona doccia (attivi solo se presenza_doccia=true)
  doccia_larghezza: number;
  doccia_lunghezza: number;
  doccia_altezza_rivestimento: number;
  doccia_piatto_type: 'NUOVO' | 'ESISTENTE' | null;
  doccia_raccordi_standard: number;
  doccia_raccordi_grandi: number;
  doccia_bbcorner_in: number;
  doccia_bbcorner_out: number;
  doccia_bbtape_ml: number;
  doccia_norphen_ml: number;
  doccia_nicchie: boolean;

  // Step 2 — Supporto + stato
  supporto_floor: string | null;
  supporto_wall: string | null;
  sub_answers_floor: SubAnswers;
  sub_answers_wall: SubAnswers;

  // Step 3 — Texture
  texture_line: TextureLineId | null;
  texture_style: TextureStyleId | null;
  color_mode: ColorMode | null;
  color_primary: ColorSelection | null;
  color_secondary: ColorSelection | null;
  lamine_pattern: string | null;

  // Step 4 — Protettivi
  protettivo: ProtettivoSelection | null;

  // Step 5 — DIN (condizionale)
  din_inputs: DinInputValues | null;

  // Engine output — derivato, aggiornato dal motore
  active_blocks: BlockingError[];
  rule_id_floor: string | null;
  rule_id_wall: string | null;
  resolved_steps_floor: StepDefinition[];
  resolved_steps_wall: StepDefinition[];
}
