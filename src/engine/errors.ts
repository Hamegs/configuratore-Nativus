export class DataError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DataError';
    this.code = code;
    this.context = context;
  }
}

export class BlockingError extends Error {
  readonly code: string;
  readonly message_it: string;

  constructor(code: string, message_it: string) {
    super(message_it);
    this.name = 'BlockingError';
    this.code = code;
    this.message_it = message_it;
  }
}

export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const HARD_BLOCK_CODES = {
  DEKORA_SHOWER: 'DEKORA non applicabile in zona doccia.',
  CORLITE_WALL: 'CORLITE è applicabile solo su pavimenti.',
  CORLITE_SHOWER: 'CORLITE non applicabile in zona doccia.',
  MATERIAL_FLOOR: 'MATERIAL è applicabile solo su pareti.',
  MATERIAL_SHOWER: 'MATERIAL non applicabile in zona doccia.',
  RISING_HUMIDITY: 'Umidità di risalita rilevata: contattare l\'assistenza tecnica.',
  CORLITE_EVIDENCE_SAME_COLOR: 'CORLITE EVIDENCE richiede due colori diversi tra loro.',
  LAME_NO_PATTERN: 'LAMINE richiede la selezione di un pattern.',
  DIN_MISSING_INPUTS: 'Per il modulo DIN 18534 tutti i campi accessori sono obbligatori.',
} as const;

export type HardBlockCode = keyof typeof HARD_BLOCK_CODES;
