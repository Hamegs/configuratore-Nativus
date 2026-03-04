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
  /** Hollow-tile status: 'NO_OR_FEW' | 'SOME' | 'ALL' */
  hollow?: string;
  piatto_doccia?: string;
  fughe_residue?: string;
  parquet_comp?: 'AS' | 'EP';
  // Piastrella con tracce impianti
  mq_tracce?: number | null;
  spessore_mm_tracce?: number | null;
  tracce_riempimento?: 'RAS_FONDO_FINO' | 'MALTA_ANTIRITIRO' | null;
  // Hollow-tile compensation (Section E)
  hollow_area_mq?: number | null;     // area of detached tiles (m²), used when hollow = 'SOME'
  tile_thickness_mm?: number | null;  // tile thickness (mm), used when hollow = 'SOME' | 'ALL'
  hollow_comp?: 'AS' | 'EP' | null;   // compensation system when hollow = 'ALL'
  // Parquet removal compensation (Section F)
  parquet_area_mq?: number | null;    // area to compensate (m²)
  parquet_thickness_mm?: number | null; // height to compensate (mm)
}

// ── Multi-superficie ──────────────────────────────────────────────────────────
// Ogni Surface corrisponde a un'area fisica (pavimento o porzione di parete)
// con la propria texture, colore e (in caso COLOR mode) colore protettivo.
export interface Surface {
  id: string;
  type: 'FLOOR' | 'WALL_PART';
  mq: number;
  texture_line: TextureLineId | null;
  texture_style: TextureStyleId | null;
  color_mode: ColorMode | null;
  color_primary: ColorSelection | null;
  color_secondary: ColorSelection | null;
  lamine_pattern: string | null;
  protector_color: ColorSelection | null;  // usato solo quando protector_mode = 'COLOR'
}

export interface WizardState {
  currentStep: number;
  maxReachedStep: number;

  // Step 0 — Ambiente + Superfici
  ambiente: AmbienteId | null;
  room_type_display: string | null;   // tipo ambiente UI: 'SOGGIORNO' | 'CUCINA' | 'CAMERA' | 'BAGNO' | 'LAVANDERIA' | 'ALTRO'
  mercato: Mercato;
  mq_pavimento: number;
  mq_pareti: number;
  superfici_confirmed: boolean;   // gate: abilita i passi successivi

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
  doccia_n_raccordi: number;

  // Step 2 — Supporto + stato
  supporto_floor: string | null;
  supporto_wall: string | null;
  sub_answers_floor: SubAnswers;
  sub_answers_wall: SubAnswers;

  // Step 3 — Texture (multi-superficie)
  surfaces: Surface[];                // modello primario per-superficie
  walls_differentiated: boolean;      // false = 1 WALL_PART, true = più WALL_PART
  // backward compat: derivati dalla prima superficie con texture_line != null
  texture_line: TextureLineId | null;
  texture_style: TextureStyleId | null;
  color_mode: ColorMode | null;
  color_primary: ColorSelection | null;
  color_secondary: ColorSelection | null;
  lamine_pattern: string | null;

  // Step 3b — Upgrade Rasante 2K (opzionale, visibile solo se la procedura contiene S_RAS_2K)
  ras2k_upgrade: 'KEEP' | 'RAS_BASE' | 'RAS_BASE_Q';

  // Step 5 — Upgrade strato di preparazione (commerciale, post-modifiers)
  preparation_upgrade: 'KEEP' | 'UPGRADE_BASE' | 'UPGRADE_BASE_Q';

  // Step 4 — Protettivi
  protettivo: ProtettivoSelection | null;
  protector_mode: 'TRASPARENTE' | 'COLOR';  // globale per ambiente
  finish_type: 'OPACO' | 'LUCIDO';          // globale per ambiente
  /** When true, floor and wall use independent protective systems */
  split_protettivi: boolean;
  protettivo_floor: ProtettivoSelection | null;  // floor-specific; null → uses protettivo
  protettivo_wall: ProtettivoSelection | null;   // wall-specific; null → uses protettivo

  // Step 5 — DIN (condizionale)
  din_inputs: DinInputValues | null;

  // Engine output — derivato, aggiornato dal motore
  active_blocks: BlockingError[];
  rule_id_floor: string | null;
  rule_id_wall: string | null;
  resolved_steps_floor: StepDefinition[];
  resolved_steps_wall: StepDefinition[];
}

