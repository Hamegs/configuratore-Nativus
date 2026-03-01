import { describe, it, expect } from 'vitest';
import { matchDecisionTable } from '../decision-table';
import type { DecisionRule } from '../../types/regole';

const MOCK_TABLE: DecisionRule[] = [
  {
    rule_id: 'W_GYP_ORD_OK',
    support_id: 'W_GYP',
    env_id: 'ORD',
    din: '0',
    zona_doccia: '0',
    humidity_band: null,
    cohesion: null,
    cracks: null,
    tile_bedding: null,
    hollow: null,
  },
  {
    rule_id: 'W_TILE_BAG',
    support_id: 'W_TILE',
    env_id: 'BAG',
    din: '0',
    zona_doccia: '0',
    humidity_band: null,
    cohesion: null,
    cracks: null,
    tile_bedding: null,
    hollow: null,
  },
  {
    rule_id: 'W_GYP_DOC',
    support_id: 'W_GYP',
    env_id: 'DOC',
    din: '0',
    zona_doccia: '1',
    humidity_band: null,
    cohesion: null,
    cracks: null,
    tile_bedding: null,
    hollow: null,
  },
  {
    rule_id: 'F_MAS_SFARINANTE',
    support_id: 'F_MAS',
    env_id: 'ORD',
    din: '0',
    zona_doccia: '0',
    humidity_band: null,
    cohesion: 'SFARINANTE',
    cracks: null,
    tile_bedding: null,
    hollow: null,
  },
  {
    rule_id: 'F_MAS_NORMAL',
    support_id: 'F_MAS',
    env_id: 'ORD',
    din: '0',
    zona_doccia: '0',
    humidity_band: null,
    cohesion: 'SOLID',
    cracks: null,
    tile_bedding: null,
    hollow: null,
  },
];

describe('matchDecisionTable', () => {
  it('matches exact rule by support + env', () => {
    const result = matchDecisionTable(MOCK_TABLE, {
      support_id: 'W_GYP',
      env_id: 'ORD',
      din: false,
      zona_doccia: false,
    });
    expect(result.rule_id).toBe('W_GYP_ORD_OK');
  });

  it('matches shower rule when zona_doccia = true', () => {
    const result = matchDecisionTable(MOCK_TABLE, {
      support_id: 'W_GYP',
      env_id: 'DOC',
      din: false,
      zona_doccia: true,
    });
    expect(result.rule_id).toBe('W_GYP_DOC');
  });

  it('matches rule with cohesion discriminator', () => {
    const result = matchDecisionTable(MOCK_TABLE, {
      support_id: 'F_MAS',
      env_id: 'ORD',
      din: false,
      zona_doccia: false,
      cohesion: 'SFARINANTE',
    });
    expect(result.rule_id).toBe('F_MAS_SFARINANTE');
  });

  it('throws DataError when no rule matches', () => {
    expect(() =>
      matchDecisionTable(MOCK_TABLE, {
        support_id: 'W_GYP',
        env_id: 'DIN',
        din: true,
        zona_doccia: false,
      }),
    ).toThrow();
  });

  it('throws DataError on ambiguous match', () => {
    const ambiguous: DecisionRule[] = [
      { ...MOCK_TABLE[0], rule_id: 'RULE_A' },
      { ...MOCK_TABLE[0], rule_id: 'RULE_B' },
    ];
    expect(() =>
      matchDecisionTable(ambiguous, {
        support_id: 'W_GYP',
        env_id: 'ORD',
        din: false,
        zona_doccia: false,
      }),
    ).toThrow();
  });
});
