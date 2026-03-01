import type { AmbienteId, MacroId, TextureLineId } from '../types/enums';
import type { DecisionRule } from '../types/regole';
import type { Supporto } from '../types/supporto';

export function getCompatibleSupporti(
  textureId: TextureLineId | null,
  envId: AmbienteId,
  macro: MacroId,
  decisionTable: DecisionRule[],
  supporti: Supporto[],
): Supporto[] {
  const supportIdsInTable = new Set(
    decisionTable
      .filter(r => r.env_id === envId)
      .map(r => r.support_id),
  );

  return supporti.filter(s => {
    if (s.macro_id !== macro) return false;
    if (!supportIdsInTable.has(s.support_id)) return false;

    if (textureId === 'CORLITE' && macro !== 'FLOOR') return false;
    if (textureId === 'MATERIAL' && macro !== 'WALL') return false;

    return true;
  });
}
