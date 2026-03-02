import { create } from 'zustand';
import type { WizardState, SubAnswers } from '../types/wizard-state';
import type { AmbienteId, TextureLineId, TextureStyleId, Mercato, ColorMode } from '../types/enums';
import type { ColorSelection } from '../types/texture';
import type { DinInputValues } from '../types/din';
import type { ProtettivoSelection } from '../types/protettivi';
import { checkHardBlocks } from '../engine/constraint-validator';

const INITIAL_STATE: WizardState = {
  currentStep: 0,
  maxReachedStep: 0,
  ambiente: null,
  room_type_display: null,
  mercato: 'IT',
  mq_pavimento: 0,
  mq_pareti: 0,
  superfici_confirmed: false,
  // BAG flags
  presenza_doccia: false,
  mercato_tedesco: false,
  // Doccia details
  doccia_larghezza: 0,
  doccia_lunghezza: 0,
  doccia_altezza_rivestimento: 0,
  doccia_piatto_type: null,
  doccia_raccordi_standard: 0,
  doccia_raccordi_grandi: 0,
  doccia_bbcorner_in: 0,
  doccia_bbcorner_out: 0,
  doccia_bbtape_ml: 0,
  doccia_norphen_ml: 0,
  doccia_nicchie: false,
  doccia_n_raccordi: 0,
  // Supporto
  supporto_floor: null,
  supporto_wall: null,
  sub_answers_floor: {},
  sub_answers_wall: {},
  // Texture
  texture_line: null,
  texture_style: null,
  color_mode: null,
  color_primary: null,
  color_secondary: null,
  lamine_pattern: null,
  // Upgrade Rasante 2K
  ras2k_upgrade: 'KEEP' as const,
  // Protettivi
  protettivo: null,
  // DIN legacy (backward compat)
  din_inputs: null,
  // Engine output
  active_blocks: [],
  rule_id_floor: null,
  rule_id_wall: null,
  resolved_steps_floor: [],
  resolved_steps_wall: [],
};

interface WizardStore extends WizardState {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  hydrateFromState: (partial: Partial<WizardState>) => void;
  // Step 0 — Ambiente
  setAmbiente: (v: AmbienteId) => void;
  setRoomTypeDisplay: (v: string | null) => void;
  setMercato: (v: Mercato) => void;
  setMqPavimento: (v: number) => void;
  setMqPareti: (v: number) => void;
  // BAG flags
  setPresenzaDoccia: (v: boolean) => void;
  setMercatoTedesco: (v: boolean) => void;
  // Superfici gate
  setSuperficiConfirmed: (v: boolean) => void;
  // Doccia details
  setDocciaLarghezza: (v: number) => void;
  setDocciaLunghezza: (v: number) => void;
  setDocciaAltezza: (v: number) => void;
  setDocciaPiattoType: (v: 'NUOVO' | 'ESISTENTE' | null) => void;
  setDocciaRaccordiStandard: (v: number) => void;
  setDocciaRaccordiGrandi: (v: number) => void;
  setDocciaBbcornerIn: (v: number) => void;
  setDocciaBbcornerOut: (v: number) => void;
  setDocciaBbtapeMl: (v: number) => void;
  setDocciaNorphenMl: (v: number) => void;
  setDoccianicchie: (v: boolean) => void;
  setDocciaRaccordi: (v: number) => void;
  // Step 2 — Supporto
  setSupportoFloor: (v: string | null) => void;
  setSupportoWall: (v: string | null) => void;
  setSubAnswerFloor: (key: keyof SubAnswers, value: SubAnswers[keyof SubAnswers]) => void;
  setSubAnswerWall: (key: keyof SubAnswers, value: SubAnswers[keyof SubAnswers]) => void;
  // Step 3 — Texture
  setTextureLine: (v: TextureLineId | null) => void;
  setTextureStyle: (v: TextureStyleId | null) => void;
  setColorMode: (v: ColorMode | null) => void;
  setColorPrimary: (v: ColorSelection | null) => void;
  setColorSecondary: (v: ColorSelection | null) => void;
  setLaminePattern: (v: string | null) => void;
  // Step 3b — Upgrade Rasante 2K
  setRas2kUpgrade: (v: WizardState['ras2k_upgrade']) => void;
  // Step 4 — Protettivi
  setProtettivo: (v: ProtettivoSelection | null) => void;
  // Legacy
  setDinInputs: (v: DinInputValues | null) => void;
}

function recomputeBlocks(state: WizardState): WizardState['active_blocks'] {
  if (!state.texture_line) return [];
  return checkHardBlocks({
    ambiente: state.ambiente,
    presenza_doccia: state.presenza_doccia,
    texture_line: state.texture_line,
    supporto_floor: state.supporto_floor,
    sub_answers_floor: state.sub_answers_floor,
    supporto_wall: state.supporto_wall,
    texture_style: state.texture_style,
    color_primary: state.color_primary,
    color_secondary: state.color_secondary,
    lamine_pattern: state.lamine_pattern,
    mq_pavimento: state.mq_pavimento,
    mq_pareti: state.mq_pareti,
  });
}

const DOCCIA_RESET = {
  doccia_larghezza: 0,
  doccia_lunghezza: 0,
  doccia_altezza_rivestimento: 0,
  doccia_piatto_type: null as null,
  doccia_raccordi_standard: 0,
  doccia_raccordi_grandi: 0,
  doccia_bbcorner_in: 0,
  doccia_bbcorner_out: 0,
  doccia_bbtape_ml: 0,
  doccia_norphen_ml: 0,
  doccia_nicchie: false,
  doccia_n_raccordi: 0,
};

export const useWizardStore = create<WizardStore>((set, get) => ({
  ...INITIAL_STATE,

  setStep: (step) => set(s => ({
    currentStep: step,
    maxReachedStep: Math.max(s.maxReachedStep, step),
  })),
  nextStep: () => set(s => ({
    currentStep: s.currentStep + 1,
    maxReachedStep: Math.max(s.maxReachedStep, s.currentStep + 1),
  })),
  prevStep: () => set(s => ({ currentStep: Math.max(0, s.currentStep - 1) })),
  reset: () => set(INITIAL_STATE),

  hydrateFromState: (partial) => {
    const merged = { ...INITIAL_STATE, ...partial, currentStep: 0, maxReachedStep: 0 };
    set({ ...merged, active_blocks: recomputeBlocks(merged as WizardState) });
  },

  setAmbiente: (v) => set(s => {
    const next = {
      ...s, ambiente: v,
      superfici_confirmed: false,
      presenza_doccia: v !== 'BAG' ? false : s.presenza_doccia,
      mercato_tedesco: v !== 'BAG' ? false : s.mercato_tedesco,
    };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setRoomTypeDisplay: (v) => set({ room_type_display: v }),
  setMercato: (v) => set({ mercato: v }),
  setMqPavimento: (v) => set({ mq_pavimento: v }),
  setMqPareti: (v) => set({ mq_pareti: v }),

  setSuperficiConfirmed: (v) => {
    if (v) {
      set({ superfici_confirmed: true });
    } else {
      set(s => ({
        ...s,
        superfici_confirmed: false,
        currentStep: 0,
        supporto_floor: null,
        supporto_wall: null,
        sub_answers_floor: {},
        sub_answers_wall: {},
        texture_line: null,
        texture_style: null,
        color_mode: null,
        color_primary: null,
        color_secondary: null,
        lamine_pattern: null,
        protettivo: null,
        active_blocks: [],
      }));
    }
  },

  setPresenzaDoccia: (v) => set(s => {
    const next = { ...s, presenza_doccia: v, ...(v ? {} : DOCCIA_RESET) };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setMercatoTedesco: (v) => set({ mercato_tedesco: v }),

  setDocciaLarghezza: (v) => set({ doccia_larghezza: v }),
  setDocciaLunghezza: (v) => set({ doccia_lunghezza: v }),
  setDocciaAltezza: (v) => set({ doccia_altezza_rivestimento: v }),
  setDocciaPiattoType: (v) => set({ doccia_piatto_type: v }),
  setDocciaRaccordiStandard: (v) => set({ doccia_raccordi_standard: v }),
  setDocciaRaccordiGrandi: (v) => set({ doccia_raccordi_grandi: v }),
  setDocciaBbcornerIn: (v) => set({ doccia_bbcorner_in: v }),
  setDocciaBbcornerOut: (v) => set({ doccia_bbcorner_out: v }),
  setDocciaBbtapeMl: (v) => set({ doccia_bbtape_ml: v }),
  setDocciaNorphenMl: (v) => set({ doccia_norphen_ml: v }),
  setDoccianicchie: (v) => set({ doccia_nicchie: v }),
  setDocciaRaccordi: (v) => set({ doccia_n_raccordi: v }),

  setSupportoFloor: (v) => set(s => {
    const next = {
      ...s,
      supporto_floor: v,
      sub_answers_floor: {},
      texture_line: null,
      texture_style: null,
      color_mode: null,
      color_primary: null,
      color_secondary: null,
      lamine_pattern: null,
      protettivo: null,
    };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setSupportoWall: (v) => set(s => {
    const next = {
      ...s,
      supporto_wall: v,
      sub_answers_wall: {},
      texture_line: null,
      texture_style: null,
      color_mode: null,
      color_primary: null,
      color_secondary: null,
      lamine_pattern: null,
      protettivo: null,
    };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setSubAnswerFloor: (key, value) => set(s => {
    const next = { ...s, sub_answers_floor: { ...s.sub_answers_floor, [key]: value } };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setSubAnswerWall: (key, value) => set(s => {
    const next = { ...s, sub_answers_wall: { ...s.sub_answers_wall, [key]: value } };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),

  setTextureLine: (v) => set(s => {
    const next = {
      ...s,
      texture_line: v,
      texture_style: null,
      color_mode: null,
      color_primary: null,
      color_secondary: null,
      lamine_pattern: null,
      protettivo: null,
    };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setTextureStyle: (v) => set(s => {
    const next = { ...s, texture_style: v, color_secondary: null };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setColorMode: (v) => set({ color_mode: v, color_primary: null, color_secondary: null }),
  setColorPrimary: (v) => set(s => {
    const next = { ...s, color_primary: v };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setColorSecondary: (v) => set(s => {
    const next = { ...s, color_secondary: v };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setLaminePattern: (v) => set(s => {
    const next = { ...s, lamine_pattern: v };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),

  setProtettivo: (v) => set({ protettivo: v }),
  setRas2kUpgrade: (v) => set({ ras2k_upgrade: v }),
  setDinInputs: (v) => set({ din_inputs: v }),
}));
