import { create } from 'zustand';
import type { WizardState, SubAnswers, Surface } from '../types/wizard-state';
import type { AmbienteId, TextureLineId, TextureStyleId, Mercato, ColorMode } from '../types/enums';
import type { ColorSelection } from '../types/texture';
import type { DinInputValues } from '../types/din';
import type { ProtettivoSelection } from '../types/protettivi';
import { checkHardBlocks } from '../engine/constraint-validator';

// ── Helpers per la creazione di superfici ─────────────────────────────────────
function mkFloor(mq: number): Surface {
  return { id: `floor-${Date.now()}`, type: 'FLOOR', mq, texture_line: null, texture_style: null, color_mode: null, color_primary: null, color_secondary: null, lamine_pattern: null, protector_color: null };
}
function mkWall(mq: number, idx: number = 1): Surface {
  return { id: `wall-${idx}-${Date.now()}`, type: 'WALL_PART', mq, texture_line: null, texture_style: null, color_mode: null, color_primary: null, color_secondary: null, lamine_pattern: null, protector_color: null };
}

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
  // Texture — multi-superficie
  surfaces: [],
  walls_differentiated: false,
  texture_line: null,
  texture_style: null,
  color_mode: null,
  color_primary: null,
  color_secondary: null,
  lamine_pattern: null,
  // Upgrade Rasante 2K
  ras2k_upgrade: 'KEEP' as const,
  // Upgrade strato di preparazione
  preparation_upgrade: 'KEEP' as const,
  // Protettivi
  protettivo: null,
  protector_mode: 'TRASPARENTE' as const,
  finish_type: 'OPACO' as const,
  split_protettivi: false,
  protettivo_floor: null,
  protettivo_wall: null,
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
  // Step 3 — Texture legacy (backward compat)
  setTextureLine: (v: TextureLineId | null) => void;
  setTextureStyle: (v: TextureStyleId | null) => void;
  setColorMode: (v: ColorMode | null) => void;
  setColorPrimary: (v: ColorSelection | null) => void;
  setColorSecondary: (v: ColorSelection | null) => void;
  setLaminePattern: (v: string | null) => void;
  // Step 3 — Surface management (multi-superficie)
  setWallsDifferentiated: (v: boolean) => void;
  addWallPart: (mq: number) => void;
  removeWallPart: (id: string) => void;
  updateSurface: (id: string, patch: Partial<Surface>) => void;
  // Step 3b — Upgrade Rasante 2K
  setRas2kUpgrade: (v: WizardState['ras2k_upgrade']) => void;
  // Step 5 — Upgrade strato di preparazione
  setPreparationUpgrade: (v: WizardState['preparation_upgrade']) => void;
  // Step 4 — Protettivi
  setProtettivo: (v: ProtettivoSelection | null) => void;
  setProtectorMode: (v: 'TRASPARENTE' | 'COLOR') => void;
  setFinishType: (v: 'OPACO' | 'LUCIDO') => void;
  setSplitProtettivi: (v: boolean) => void;
  setProtettivoFloor: (v: ProtettivoSelection | null) => void;
  setProtettivoWall: (v: ProtettivoSelection | null) => void;
  // Legacy
  setDinInputs: (v: DinInputValues | null) => void;
}

function recomputeBlocks(state: WizardState): WizardState['active_blocks'] {
  // Multi-superficie: controlla ogni superficie
  if (state.surfaces.length > 0) {
    const allBlocks: ReturnType<typeof checkHardBlocks> = [];
    for (const surface of state.surfaces) {
      if (!surface.texture_line) continue;
      const blocks = checkHardBlocks({
        ambiente: state.ambiente,
        presenza_doccia: state.presenza_doccia,
        texture_line: surface.texture_line,
        supporto_floor: state.supporto_floor,
        sub_answers_floor: state.sub_answers_floor,
        supporto_wall: state.supporto_wall,
        texture_style: surface.texture_style,
        color_primary: surface.color_primary,
        color_secondary: surface.color_secondary,
        lamine_pattern: surface.lamine_pattern,
        mq_pavimento: surface.type === 'FLOOR' ? surface.mq : 0,
        mq_pareti: surface.type === 'WALL_PART' ? surface.mq : 0,
      });
      allBlocks.push(...blocks);
    }
    return allBlocks;
  }
  // Fallback singola texture (backward compat)
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

// Campi da azzerare quando si torna indietro sui supporti/texture
const TEXTURE_RESET = {
  surfaces: [] as Surface[],
  walls_differentiated: false,
  texture_line: null as null,
  texture_style: null as null,
  color_mode: null as null,
  color_primary: null as null,
  color_secondary: null as null,
  lamine_pattern: null as null,
  protettivo: null as null,
  protector_mode: 'TRASPARENTE' as const,
  finish_type: 'OPACO' as const,
};

// Resetta solo la configurazione texture (non l'array surfaces)
const TEXTURE_CONFIG_RESET = {
  walls_differentiated: false,
  texture_line: null as null,
  texture_style: null as null,
  color_mode: null as null,
  color_primary: null as null,
  color_secondary: null as null,
  lamine_pattern: null as null,
  protettivo: null as null,
  protector_mode: 'TRASPARENTE' as const,
  finish_type: 'OPACO' as const,
};

function resetSurfacesTexture(surfaces: Surface[]): Surface[] {
  return surfaces.map(surf => ({
    ...surf,
    texture_line: null,
    texture_style: null,
    color_mode: null,
    color_primary: null,
    color_secondary: null,
    lamine_pattern: null,
    protector_color: null,
  }));
}

export const useWizardStore = create<WizardStore>((set) => ({
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

  // ── Superfici gate: inizializza le superfici quando confermato ────────────
  setSuperficiConfirmed: (v) => {
    if (v) {
      set(s => {
        const surfaces: Surface[] = [];
        if (s.mq_pavimento > 0) surfaces.push(mkFloor(s.mq_pavimento));
        if (s.mq_pareti > 0 && !s.walls_differentiated) surfaces.push(mkWall(s.mq_pareti));
        return { superfici_confirmed: true, surfaces };
      });
    } else {
      set(s => ({
        ...s,
        superfici_confirmed: false,
        currentStep: 0,
        supporto_floor: null,
        supporto_wall: null,
        sub_answers_floor: {},
        sub_answers_wall: {},
        ...TEXTURE_RESET,
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
    const next = { ...s, supporto_floor: v, sub_answers_floor: {}, ...TEXTURE_CONFIG_RESET, surfaces: resetSurfacesTexture(s.surfaces) };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),
  setSupportoWall: (v) => set(s => {
    const next = { ...s, supporto_wall: v, sub_answers_wall: {}, ...TEXTURE_CONFIG_RESET, surfaces: resetSurfacesTexture(s.surfaces) };
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

  // ── Texture legacy (backward compat — set anche in updateSurface) ─────────
  setTextureLine: (v) => set(s => {
    const next = { ...s, texture_line: v, texture_style: null, color_mode: null, color_primary: null, color_secondary: null, lamine_pattern: null, protettivo: null };
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

  // ── Surface management ────────────────────────────────────────────────────
  setWallsDifferentiated: (v) => set(s => {
    const floors = s.surfaces.filter(surf => surf.type === 'FLOOR');
    const walls: Surface[] = v ? [] : s.mq_pareti > 0 ? [mkWall(s.mq_pareti)] : [];
    const surfaces = [...floors, ...walls];
    return { walls_differentiated: v, surfaces };
  }),

  addWallPart: (mq) => set(s => {
    const usedMq = s.surfaces.filter(surf => surf.type === 'WALL_PART').reduce((acc, surf) => acc + surf.mq, 0);
    const remaining = s.mq_pareti - usedMq;
    if (mq <= 0 || mq > remaining + 0.001) return s;
    const idx = s.surfaces.filter(surf => surf.type === 'WALL_PART').length + 1;
    return { surfaces: [...s.surfaces, mkWall(mq, idx)] };
  }),

  removeWallPart: (id) => set(s => ({
    surfaces: s.surfaces.filter(surf => surf.id !== id),
  })),

  updateSurface: (id, patch) => set(s => {
    const surfaces = s.surfaces.map(surf => surf.id === id ? { ...surf, ...patch } : surf);
    // Mantieni backward compat: deriva texture_line etc. dalla prima superficie con texture_line != null
    const primary = surfaces.find(surf => surf.texture_line !== null);
    const next: WizardState = {
      ...s,
      surfaces,
      texture_line: primary?.texture_line ?? null,
      texture_style: primary?.texture_style ?? null,
      color_mode: primary?.color_mode ?? null,
      color_primary: primary?.color_primary ?? null,
      color_secondary: primary?.color_secondary ?? null,
      lamine_pattern: primary?.lamine_pattern ?? null,
    };
    return { ...next, active_blocks: recomputeBlocks(next) };
  }),

  // ── Protettivi ────────────────────────────────────────────────────────────
  setProtettivo: (v) => set({ protettivo: v }),

  setProtectorMode: (v) => set(s => ({
    protector_mode: v,
    // Azzera protector_color su tutte le superfici se si torna a TRASPARENTE
    surfaces: v === 'TRASPARENTE'
      ? s.surfaces.map(surf => ({ ...surf, protector_color: null }))
      : s.surfaces,
  })),

  setFinishType: (v) => set({ finish_type: v }),

  setSplitProtettivi: (v) => set({ split_protettivi: v }),
  setProtettivoFloor: (v) => set({ protettivo_floor: v }),
  setProtettivoWall: (v) => set({ protettivo_wall: v }),

  setRas2kUpgrade: (v) => set({ ras2k_upgrade: v }),
  setPreparationUpgrade: (v) => set({ preparation_upgrade: v }),
  setDinInputs: (v) => set({ din_inputs: v }),
}));
