import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../../store/wizard-store';
import { useAuthStore } from '../../store/auth-store';
import { useProjectStore } from '../../store/project-store';
import { StepAmbiente } from './StepAmbiente';
import { StepSupporto } from './StepSupporto';
import { StepSupportoRivenditore } from './StepSupportoRivenditore';
import { StepTexture } from './StepTexture';
import { StepProtettivi } from './StepProtettivi';
import { StepReview } from './StepReview';
import { loadDataStore } from '../../utils/data-loader';
import type { CartResult } from '../../engine/cart-calculator';

/**
 * Flusso Admin/Applicatore:
 *   0 Superfici → 1 Supporto → 2 Texture → 3 Protettivi → 4 Riepilogo
 *
 * Flusso Rivenditore:
 *   0 Superfici → 1 Texture → 2 Protettivi → 3 Supporto → 4 Riepilogo
 */
const STEPS_APPLICATORE = ['Superfici', 'Supporto', 'Texture', 'Protettivi', 'Riepilogo'];
const STEPS_RIVENDITORE  = ['Superfici', 'Texture', 'Protettivi', 'Supporto', 'Riepilogo'];

interface WizardContainerProps {
  onComplete?: (result: CartResult) => void;
  /** Nasconde il selettore ambiente (usato quando l'ambiente è già fissato dalla stanza) */
  lockedAmbiente?: boolean;
}

export function WizardContainer({ onComplete, lockedAmbiente = false }: WizardContainerProps) {
  const { currentStep } = useWizardStore();
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const isRivenditore = user?.role === 'rivenditore';
  const stepLabels = isRivenditore ? STEPS_RIVENDITORE : STEPS_APPLICATORE;

  function handleComplete(result: CartResult) {
    if (onComplete) {
      onComplete(result);
    } else {
      // Standalone mode: auto-crea una stanza nel progetto e naviga al carrello
      const { addRoom, setRoomResult } = useProjectStore.getState();
      const store = loadDataStore();
      const wizState = useWizardStore.getState();
      const ambiente = wizState.ambiente ?? 'ORD';
      const roomTypeMap: Record<string, string> = { ORD: 'SOGGIORNO', BAG: 'BAGNO', DOC: 'BAGNO', DIN: 'BAGNO' };
      const roomType = roomTypeMap[ambiente] ?? 'ALTRO';
      const roomId = addRoom(roomType, '');
      setRoomResult(roomId, wizState, result.summary.lines, store, result);
      navigate('/progetto/carrello');
    }
  }

  const reviewStep = stepLabels.length - 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <StepProgress current={currentStep} labels={stepLabels} />

      <div className="mt-8">
        {currentStep === 0 && <StepAmbiente lockedAmbiente={lockedAmbiente} />}

        {!isRivenditore && currentStep === 1 && <StepSupporto />}
        {!isRivenditore && currentStep === 2 && <StepTexture />}
        {!isRivenditore && currentStep === 3 && <StepProtettivi />}

        {isRivenditore && currentStep === 1 && <StepTexture />}
        {isRivenditore && currentStep === 2 && <StepProtettivi />}
        {isRivenditore && currentStep === 3 && <StepSupportoRivenditore />}

        {currentStep === reviewStep && (
          <StepReview onComplete={handleComplete} completeLabel="Aggiungi al carrello" />
        )}
      </div>
    </div>
  );
}

// ─── Step progress indicator ──────────────────────────────────────────────────

interface StepProgressProps {
  current: number;
  labels: string[];
}

function StepProgress({ current, labels }: StepProgressProps) {
  return (
    <nav aria-label="Progressione wizard">
      <ol className="flex items-center gap-0">
        {labels.map((label, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <li key={i} className="flex flex-1 items-center">
              <div className="flex flex-col items-center min-w-0">
                <span
                  className={`step-badge flex-shrink-0 ${
                    isCompleted
                      ? 'bg-brand-600 text-white'
                      : isActive
                      ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-400'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </span>
                <span
                  className={`mt-1 text-center text-xs leading-tight truncate max-w-[72px] ${
                    isActive ? 'font-semibold text-brand-700' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 mb-4 ${
                    isCompleted ? 'bg-brand-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
