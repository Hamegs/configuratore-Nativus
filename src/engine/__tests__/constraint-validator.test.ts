import { describe, it, expect } from 'vitest';
import { checkHardBlocks } from '../constraint-validator';
import type { BlockCheckInput } from '../constraint-validator';

function baseInput(overrides: Partial<BlockCheckInput> = {}): BlockCheckInput {
  return {
    ambiente: 'ORD',
    texture_line: 'NATURAL',
    supporto_floor: 'F_MAS',
    sub_answers_floor: {},
    supporto_wall: null,
    texture_style: 'CHROMO',
    color_primary: null,
    color_secondary: null,
    lamine_pattern: null,
    mq_pavimento: 10,
    mq_pareti: 0,
    ...overrides,
  };
}

describe('checkHardBlocks', () => {
  it('returns no blocks for valid NATURAL + ORD + floor', () => {
    const blocks = checkHardBlocks(baseInput());
    expect(blocks).toHaveLength(0);
  });

  it('blocks DEKORA in shower (DOC)', () => {
    const blocks = checkHardBlocks(baseInput({ ambiente: 'DOC', texture_line: 'DEKORA' }));
    expect(blocks.some(b => b.code === 'DEKORA_SHOWER')).toBe(true);
  });

  it('blocks DEKORA in DIN zone', () => {
    const blocks = checkHardBlocks(baseInput({ ambiente: 'DIN', texture_line: 'DEKORA' }));
    expect(blocks.some(b => b.code === 'DEKORA_SHOWER')).toBe(true);
  });

  it('blocks CORLITE in shower', () => {
    const blocks = checkHardBlocks(baseInput({ ambiente: 'DOC', texture_line: 'CORLITE' }));
    expect(blocks.some(b => b.code === 'CORLITE_SHOWER')).toBe(true);
  });

  it('blocks CORLITE on walls-only surface', () => {
    const blocks = checkHardBlocks(baseInput({
      texture_line: 'CORLITE',
      mq_pavimento: 0,
      mq_pareti: 10,
    }));
    expect(blocks.some(b => b.code === 'CORLITE_WALL')).toBe(true);
  });

  it('blocks MATERIAL on floor', () => {
    const blocks = checkHardBlocks(baseInput({ texture_line: 'MATERIAL', mq_pavimento: 10, mq_pareti: 0 }));
    expect(blocks.some(b => b.code === 'MATERIAL_FLOOR')).toBe(true);
  });

  it('blocks MATERIAL in shower', () => {
    const blocks = checkHardBlocks(baseInput({
      ambiente: 'DOC',
      texture_line: 'MATERIAL',
      mq_pavimento: 0,
      mq_pareti: 10,
    }));
    expect(blocks.some(b => b.code === 'MATERIAL_SHOWER')).toBe(true);
  });

  it('blocks rising humidity', () => {
    const blocks = checkHardBlocks(baseInput({
      sub_answers_floor: { humidity_band: 'RISING' },
    }));
    expect(blocks.some(b => b.code === 'RISING_HUMIDITY')).toBe(true);
  });

  it('blocks CORLITE EVIDENCE with same colors', () => {
    const sameColor = { type: 'RAL' as const, label: 'RAL 9010', code: '9010' };
    const blocks = checkHardBlocks(baseInput({
      texture_line: 'CORLITE',
      texture_style: 'COR_EVIDENCE',
      color_primary: sameColor,
      color_secondary: sameColor,
    }));
    expect(blocks.some(b => b.code === 'CORLITE_EVIDENCE_SAME_COLOR')).toBe(true);
  });

  it('blocks LAMINE without pattern', () => {
    const blocks = checkHardBlocks(baseInput({ texture_line: 'LAMINE', lamine_pattern: null }));
    expect(blocks.some(b => b.code === 'LAME_NO_PATTERN')).toBe(true);
  });

  it('does NOT block LAMINE when pattern is set', () => {
    const blocks = checkHardBlocks(baseInput({ texture_line: 'LAMINE', lamine_pattern: 'PAT_01' }));
    expect(blocks.filter(b => b.code === 'LAME_NO_PATTERN')).toHaveLength(0);
  });
});
