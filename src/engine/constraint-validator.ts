import type { TextureLineId, AmbienteId } from '../types/enums';
import type { WizardState } from '../types/wizard-state';
import { BlockingError, HARD_BLOCK_CODES } from './errors';

export interface BlockCheckInput {
  ambiente: AmbienteId | null;
  presenza_doccia?: boolean;
  texture_line: TextureLineId | null;
  supporto_floor: string | null;
  sub_answers_floor: WizardState['sub_answers_floor'];
  supporto_wall: string | null;
  texture_style: WizardState['texture_style'];
  color_primary: WizardState['color_primary'];
  color_secondary: WizardState['color_secondary'];
  lamine_pattern: string | null;
  mq_pavimento: number;
  mq_pareti: number;
}

export function checkHardBlocks(input: BlockCheckInput): BlockingError[] {
  const blocks: BlockingError[] = [];

  const isShower = input.presenza_doccia === true ||
    input.ambiente === 'DOC' || input.ambiente === 'DIN';
  const isFloor = input.mq_pavimento > 0;
  const isWall = input.mq_pareti > 0;

  if (input.texture_line === null) return blocks;

  // DEKORA vietata in doccia
  if (input.texture_line === 'DEKORA' && isShower) {
    blocks.push(new BlockingError('DEKORA_SHOWER', HARD_BLOCK_CODES.DEKORA_SHOWER));
  }

  // CORLITE: solo pavimenti
  if (input.texture_line === 'CORLITE') {
    if (isShower) {
      blocks.push(new BlockingError('CORLITE_SHOWER', HARD_BLOCK_CODES.CORLITE_SHOWER));
    } else if (isWall && !isFloor) {
      blocks.push(new BlockingError('CORLITE_WALL', HARD_BLOCK_CODES.CORLITE_WALL));
    } else if (isWall && isFloor) {
      // CORLITE su area mista: blocco se ci sono anche pareti
      blocks.push(new BlockingError('CORLITE_WALL', HARD_BLOCK_CODES.CORLITE_WALL));
    }
  }

  // MATERIAL: solo pareti, no doccia
  if (input.texture_line === 'MATERIAL') {
    if (isShower) {
      blocks.push(new BlockingError('MATERIAL_SHOWER', HARD_BLOCK_CODES.MATERIAL_SHOWER));
    } else if (isFloor) {
      blocks.push(new BlockingError('MATERIAL_FLOOR', HARD_BLOCK_CODES.MATERIAL_FLOOR));
    }
  }

  // Umidità di risalita
  if (
    input.sub_answers_floor?.humidity_band === 'RISING' ||
    input.sub_answers_floor?.humidity_band === 'RISALITA'
  ) {
    blocks.push(new BlockingError('RISING_HUMIDITY', HARD_BLOCK_CODES.RISING_HUMIDITY));
  }

  // CORLITE EVIDENCE colori uguali
  if (
    input.texture_line === 'CORLITE' &&
    input.texture_style === 'COR_EVIDENCE' &&
    input.color_primary &&
    input.color_secondary &&
    input.color_primary.label === input.color_secondary.label
  ) {
    blocks.push(new BlockingError('CORLITE_EVIDENCE_SAME_COLOR', HARD_BLOCK_CODES.CORLITE_EVIDENCE_SAME_COLOR));
  }

  // LAMINE senza pattern
  if (input.texture_line === 'LAMINE' && !input.lamine_pattern) {
    blocks.push(new BlockingError('LAME_NO_PATTERN', HARD_BLOCK_CODES.LAME_NO_PATTERN));
  }

  return blocks;
}

export function hasFatalBlocks(blocks: BlockingError[]): boolean {
  return blocks.some(b =>
    b.code !== 'LAME_NO_PATTERN'
  );
}

export function canProceedToCart(blocks: BlockingError[]): boolean {
  return blocks.length === 0;
}
