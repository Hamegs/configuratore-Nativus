import type { WizardState } from '../types/wizard-state';
import type { AmbienteId } from '../types/enums';

export function effectiveAmbiente(state: WizardState): AmbienteId {
  if (state.ambiente === 'BAG' && state.presenza_doccia && state.mercato_tedesco) return 'DIN';
  if (state.ambiente === 'BAG' && state.presenza_doccia) return 'DOC';
  return state.ambiente ?? 'ORD';
}

export function isEffectiveShower(state: WizardState): boolean {
  return state.presenza_doccia === true;
}

export function isEffectiveDin(state: WizardState): boolean {
  return state.presenza_doccia === true && state.mercato_tedesco === true;
}
