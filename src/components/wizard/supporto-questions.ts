import type { DecisionRule } from '../../types/regole';
import type { SubAnswers } from '../../types/wizard-state';
import type { Supporto } from '../../types/supporto';

export interface SubQuestion {
  key: string;
  label: string;
  type: 'yesno' | 'select' | 'number';
  options?: Array<{ value: string; label: string }>;
  optional?: boolean;
}

// ── Question atoms ─────────────────────────────────────────────────────────────

const Q_COHESION_SFAR: SubQuestion = {
  key: 'cohesion', label: 'Il supporto è sfarinante?', type: 'yesno',
};

const Q_COHESION_GYP: SubQuestion = {
  key: 'cohesion', label: 'Stato del cartongesso', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'PERFETTO', label: 'Perfetto (solo primer e primer bond)' },
    { value: 'RETTIFICA', label: 'Con rettifiche (rasante 2k + rete)' },
  ],
};

const Q_COHESION_TILE: SubQuestion = {
  key: 'cohesion', label: 'Levellamento della piastrella', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'LEV_OK', label: 'OK (levigatura sufficiente)' },
    { value: 'LEV_NOK', label: 'Insufficiente (richiede lavorazione aggiuntiva)' },
  ],
};

const Q_HUMIDITY_STD: SubQuestion = {
  key: 'humidity_band', label: 'Umidità residua del supporto', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'LE3', label: 'Bassa (≤ 3%)' },
    { value: '3_8', label: 'Media (3–8%)' },
    { value: 'GT8_OR_ISSUE', label: 'Alta (> 8%) o problematica — barriera obbligatoria' },
  ],
};

const Q_HUMIDITY_COTTO: SubQuestion = {
  key: 'humidity_band', label: 'Umidità residua del cotto', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'LE8', label: 'Standard (≤ 8%)' },
    { value: 'GT8_OR_NOBARR', label: 'Alta (> 8%) o senza barriera vapore' },
  ],
};

const Q_CREPE: SubQuestion = {
  key: 'crepe', label: 'Presenza di crepe?', type: 'yesno',
};

export const Q_CREPE_ML: SubQuestion = {
  key: 'crepe_ml', label: 'Lunghezza totale crepe (ml)', type: 'number', optional: true,
};

const Q_HOLLOW: SubQuestion = {
  key: 'hollow', label: 'Piastrelle a vuoto?', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'NO_OR_FEW', label: 'Nessuno o vuoti puntuali (ripristino locale)' },
    { value: 'SOME', label: 'Diversi vuoti (rimozione parziale)' },
    { value: 'ALL', label: 'Tutte a vuoto (demolizione + compensazione quota)' },
  ],
};

const Q_TILE_BEDDING: SubQuestion = {
  key: 'tile_bedding', label: 'Tipo di posa (opzionale)', type: 'select', optional: true,
  options: [
    { value: '', label: '— Non specificato —' },
    { value: 'COLLA', label: 'A colla' },
    { value: 'SABCEM', label: 'Sabbia e cemento' },
  ],
};

const Q_TILE_BEDDING_REQUIRED: SubQuestion = {
  key: 'tile_bedding', label: 'Tipo di posa', type: 'select',
  options: [
    { value: '', label: '— Seleziona tipo —' },
    { value: 'COLLA', label: 'A colla' },
    { value: 'SABCEM', label: 'Sabbia e cemento' },
  ],
};

const Q_COHESION_SHOWER_PIATTO: SubQuestion = {
  key: 'cohesion', label: 'Situazione piatto doccia', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'PIATTO_ESIST', label: 'Piatto esistente (raccordi e sigillature)' },
    { value: 'PIATTO_NEW', label: 'Piatto da realizzare (massetto epossidico)' },
  ],
};

const Q_COHESION_DIN_MODE: SubQuestion = {
  key: 'cohesion', label: 'Modalità DIN 18534', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'BASE', label: 'Impermeabilizzazione DIN base (guaina + raccordi)' },
    { value: 'PIATTO_NEW', label: 'DIN + piatto da realizzare (massetto epossidico)' },
  ],
};

const Q_PARQUET_COMP: SubQuestion = {
  key: 'parquet_comp', label: 'Compensazione quota post-rimozione', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'AS', label: 'Autolivellante AS' },
    { value: 'EP', label: 'Massetto epossidico' },
  ],
};

// ── Piastrella con tracce ─────────────────────────────────────────────────────
const Q_TRACCE_MQ_PAV: SubQuestion = {
  key: 'mq_tracce', label: 'Superficie tracce pavimento (m²)', type: 'number',
};

const Q_TRACCE_MQ_PAR: SubQuestion = {
  key: 'mq_tracce', label: 'Superficie tracce parete (m²)', type: 'number',
};

const Q_TRACCE_SPESSORE: SubQuestion = {
  key: 'spessore_mm_tracce', label: 'Spessore medio tracce (mm)', type: 'number',
};

const Q_TRACCE_RIEMPIMENTO: SubQuestion = {
  key: 'tracce_riempimento', label: 'Materiale di riempimento tracce', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'RAS_FONDO_FINO', label: 'Rasante Fondo Fino (calcolo automatico)' },
    { value: 'MALTA_ANTIRITIRO', label: 'Malta antiritiro strutturale (solo nota tecnica)' },
  ],
};

const Q_FUGHE_RESIDUE: SubQuestion = {
  key: 'fughe_residue', label: 'Fughe residue', type: 'select',
  options: [
    { value: '', label: '— Seleziona —' },
    { value: 'OK', label: 'OK (ordinarie)' },
    { value: 'CRITICHE', label: 'Critiche (passaggio fondo aggiuntivo richiesto)' },
  ],
};

// ── Field → question override per support ────────────────────────────────────
// Only needed when a field uses different values/semantics for a specific support.
// Falls back to DEFAULT_FIELD_Q for everything else.

const SUPPORT_FIELD_Q: Record<string, Record<string, SubQuestion>> = {
  F_COT:     { humidity_band: Q_HUMIDITY_COTTO },
  F_TILE:    { hollow: Q_HOLLOW, tile_bedding: Q_TILE_BEDDING_REQUIRED },
  W_GYP:     { cohesion: Q_COHESION_GYP },
  W_TILE:    { cohesion: Q_COHESION_TILE },
  W_SHW_MOD: { cohesion: Q_COHESION_SHOWER_PIATTO },
  W_DIN:     { cohesion: Q_COHESION_DIN_MODE },
};

const DEFAULT_FIELD_Q: Record<string, SubQuestion> = {
  cohesion:      Q_COHESION_SFAR,
  humidity_band: Q_HUMIDITY_STD,
  cracks:        Q_CREPE,
  hollow:        Q_HOLLOW,
  tile_bedding:  Q_TILE_BEDDING,
};

// Non-DT extras: fields not in the decision table but needed by the engine
// (parquet comp uses resolveCompRule; fughe/crepe_ml are for texture calc)
const SUPPORT_EXTRAS: Record<string, SubQuestion[]> = {
  F_PAR_RM:       [Q_PARQUET_COMP],
  F_MAS:          [Q_CREPE_ML],
  F_CLS:          [Q_CREPE_ML],
  W_TILE:         [Q_FUGHE_RESIDUE],
  W_MOS:          [Q_FUGHE_RESIDUE],
  F_TILE_TRACES:  [Q_TRACCE_MQ_PAV, Q_TRACCE_SPESSORE],
  W_TILE_TRACES:  [Q_TRACCE_MQ_PAR, Q_TRACCE_SPESSORE, Q_TRACCE_RIEMPIMENTO],
};

// DT field scan order (determines question display order)
const DT_FIELD_ORDER = ['cohesion', 'humidity_band', 'cracks', 'hollow', 'tile_bedding'] as const;

// ── Dynamic question builder ──────────────────────────────────────────────────
// Scans the decision table for the given support + env combination and returns
// ONLY the questions for fields that are actual discriminators (2+ distinct
// non-null values among the matching rules).

function getDiscriminatingFields(
  supportId: string,
  envId: string,
  isDin: boolean,
  isShower: boolean,
  decisionTable: DecisionRule[],
): Set<string> {
  const relevantRules = decisionTable.filter(r => {
    if (r.support_id !== supportId) return false;
    if (r.env_id !== envId) return false;
    const dinOk  = r.din  === null || r.din  === '' || r.din  === (isDin    ? '1' : '0');
    const docOk  = r.zona_doccia === null || r.zona_doccia === '' || r.zona_doccia === (isShower ? '1' : '0');
    return dinOk && docOk;
  });

  if (relevantRules.length <= 1) return new Set();

  const discriminating = new Set<string>();
  for (const field of DT_FIELD_ORDER) {
    const distinct = new Set(
      relevantRules
        .map(r => r[field as keyof DecisionRule] as string | null)
        .filter(v => v !== null && v !== '' && v !== undefined),
    );
    if (distinct.size >= 2) discriminating.add(field);
  }
  return discriminating;
}

export function buildQuestionsForSupport(
  supportId: string | null,
  envId: string | null,
  isDin: boolean,
  isShower: boolean,
  decisionTable: DecisionRule[],
): SubQuestion[] {
  if (!supportId || !envId) return [];

  const fields = getDiscriminatingFields(supportId, envId, isDin, isShower, decisionTable);
  const overrides = SUPPORT_FIELD_Q[supportId] ?? {};

  const dtQuestions = DT_FIELD_ORDER
    .filter(f => fields.has(f))
    .map(f => overrides[f] ?? DEFAULT_FIELD_Q[f])
    .filter(Boolean);

  const extras = SUPPORT_EXTRAS[supportId] ?? [];

  return [...dtQuestions, ...extras];
}

// Supports that use resolveCompRule (no DT entry needed — handled specially in cart-calculator)
const SPECIAL_SUPPORTS = new Set(['F_PAR_RM', 'F_PAR_AS', 'F_PAR_EP']);
const HIDDEN_SUPPORTS = new Set(['F_COMP']);

/**
 * Returns only the supporti that have at least one matching DT rule for the
 * current ambiente + din + shower context. This prevents the user from ever
 * selecting a support that would produce "Nessuna regola trovata".
 */
export function getAvailableSupporti(
  macro: 'FLOOR' | 'WALL',
  envId: string | null,
  isDin: boolean,
  isShower: boolean,
  decisionTable: DecisionRule[],
  supporti: Supporto[],
): Supporto[] {
  if (!envId) return [];
  return supporti.filter(s => {
    if (s.macro_id !== macro) return false;
    if (HIDDEN_SUPPORTS.has(s.support_id)) return false;
    if (SPECIAL_SUPPORTS.has(s.support_id)) return true;
    return decisionTable.some(r => {
      if (r.support_id !== s.support_id) return false;
      if (r.env_id !== envId) return false;
      const dinOk = r.din === null || r.din === '' || r.din === (isDin ? '1' : '0');
      const docOk = r.zona_doccia === null || r.zona_doccia === ''
        || r.zona_doccia === (isShower ? '1' : '0');
      return dinOk && docOk;
    });
  });
}

export function areSubAnswersComplete(
  supportId: string | null,
  sub: SubAnswers,
  envId: string | null,
  isDin: boolean,
  isShower: boolean,
  decisionTable: DecisionRule[],
): boolean {
  if (!supportId || !envId) return false;
  const questions = buildQuestionsForSupport(supportId, envId, isDin, isShower, decisionTable);
  return questions.every(q => {
    if (q.optional) return true;
    const val = sub[q.key as keyof SubAnswers];
    if (q.type === 'yesno') return val === true || val === false;
    if (q.type === 'select') return typeof val === 'string' && val !== '';
    return true;
  });
}
