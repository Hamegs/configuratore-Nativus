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
import { StepCart } from './StepCart';
import { loadDataStore } from '../../utils/data-loader';
import type { CartResult } from '../../engine/cart-calculator';
import type { PackagingStrategy } from '../../types/project';

const STEPS_APPLICATORE = ['Superfici', 'Supporto', 'Texture', 'Protettivi', 'Riepilogo', 'Carrello'];
const STEPS_RIVENDITORE  = ['Superfici', 'Texture', 'Protettivi', 'Supporto', 'Riepilogo', 'Carrello'];

interface WizardContainerProps {
  onComplete?: (result: CartResult) => void;
  lockedAmbiente?: boolean;
}

export function WizardContainer({ onComplete, lockedAmbiente = false }: WizardContainerProps) {
  const { currentStep } = useWizardStore();
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const isRivenditore = user?.role === 'rivenditore';
  const stepLabels = isRivenditore ? STEPS_RIVENDITORE : STEPS_APPLICATORE;

  const reviewStep = stepLabels.length - 2;
  const cartStep   = stepLabels.length - 1;

  function handleComplete(result: CartResult, strategy: PackagingStrategy = 'MINIMO_SFRIDO') {
    if (onComplete) {
      onComplete(result);
    } else {
      const { addRoom, setRoomResult, setStrategy } = useProjectStore.getState();
      const store    = loadDataStore();
      const wizState = useWizardStore.getState();
      const ambiente = wizState.ambiente ?? 'ORD';
      const roomTypeMap: Record<string, string> = { ORD: 'SOGGIORNO', BAG: 'BAGNO', DOC: 'BAGNO', DIN: 'BAGNO' };
      const roomType = roomTypeMap[ambiente] ?? 'ALTRO';
      const roomId = addRoom(roomType, '');
      setRoomResult(roomId, wizState, result.summary.lines, store, result);
      setStrategy(strategy, store);
      navigate('/progetto/carrello');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <StepProgress current={currentStep} labels={stepLabels} />
      <div className="mt-10">
        {currentStep === 0 && <StepAmbiente lockedAmbiente={lockedAmbiente} />}

        {!isRivenditore && currentStep === 1 && <StepSupporto />}
        {!isRivenditore && currentStep === 2 && <StepTexture />}
        {!isRivenditore && currentStep === 3 && <StepProtettivi />}

        {isRivenditore && currentStep === 1 && <StepTexture />}
        {isRivenditore && currentStep === 2 && <StepProtettivi />}
        {isRivenditore && currentStep === 3 && <StepSupportoRivenditore />}

        {currentStep === reviewStep && <StepReview />}
        {currentStep === cartStep   && <StepCart onComplete={handleComplete} />}
      </div>
    </div>
  );
}

// ─── Step progress indicator — Nativus editorial style ───────────────────────

interface StepProgressProps {
  current: number;
  labels: string[];
}

function StepProgress({ current, labels }: StepProgressProps) {
  return (
    <nav aria-label="Progressione wizard">
      {/* Top thin line */}
      <div className="w-full h-px bg-linen-300 mb-6" />

      {/* Step track */}
      <ol className="flex items-start gap-0">
        {labels.map((label, i) => {
          const isCompleted = i < current;
          const isActive    = i === current;
          const isLast      = i === labels.length - 1;

          return (
            <React.Fragment key={i}>
              <li className="flex flex-col items-center min-w-0">
                {/* Dot */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0',
                    backgroundColor: isCompleted ? '#171e29' : isActive ? '#897e5e' : 'transparent',
                    border: isCompleted
                      ? '1px solid #171e29'
                      : isActive
                      ? '1px solid #897e5e'
                      : '1px solid #c4c5c1',
                    color: isCompleted || isActive ? '#ffffff' : '#8b8f94',
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? '✓' : i + 1}
                </span>

                {/* Label */}
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#171e29' : isCompleted ? '#445164' : '#a8a9a4',
                    whiteSpace: 'nowrap',
                    maxWidth: 72,
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </span>
              </li>

              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    marginTop: 14,
                    backgroundColor: isCompleted ? '#171e29' : '#c4c5c1',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Bottom thin line */}
      <div className="w-full h-px bg-linen-300 mt-6" />
    </nav>
  );
}
