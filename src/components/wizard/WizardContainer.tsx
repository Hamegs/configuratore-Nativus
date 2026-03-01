import React, { useState } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { useAuthStore } from '../../store/auth-store';
import { StepAmbiente } from './StepAmbiente';
import { StepSupporto } from './StepSupporto';
import { StepSupportoRivenditore } from './StepSupportoRivenditore';
import { StepTexture } from './StepTexture';
import { StepProtettivi } from './StepProtettivi';
import { StepReview } from './StepReview';
import { OrderResultPage } from '../views/OrderResultPage';
import type { CartResult } from '../../engine/cart-calculator';

const STEPS_APPLICATORE = ['Ambiente', 'Supporto', 'Texture', 'Protettivi', 'Riepilogo'];
const STEPS_RIVENDITORE  = ['Ambiente', 'Texture', 'Supporto', 'Protettivi', 'Riepilogo'];

interface WizardContainerProps {
  onComplete?: (result: CartResult) => void;
}

export function WizardContainer({ onComplete }: WizardContainerProps) {
  const { currentStep } = useWizardStore();
  const user = useAuthStore(s => s.user);
  const [cartResult, setCartResult] = useState<CartResult | null>(null);

  const isRivenditore = user?.role === 'rivenditore' || user?.role === 'admin';
  const stepLabels = isRivenditore ? STEPS_RIVENDITORE : STEPS_APPLICATORE;

  function handleComplete(result: CartResult) {
    if (onComplete) {
      onComplete(result);
    } else {
      setCartResult(result);
    }
  }

  if (cartResult && !onComplete) {
    return <OrderResultPage result={cartResult} onReset={() => setCartResult(null)} />;
  }

  const reviewStep = stepLabels.length - 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <StepProgress current={currentStep} labels={stepLabels} />

      <div className="mt-8">
        {/* Step 0 — Ambiente (identico per entrambi i flussi) */}
        {currentStep === 0 && <StepAmbiente />}

        {/* Flusso Applicatore: Ambiente → Supporto → Texture → Protettivi → Review */}
        {!isRivenditore && currentStep === 1 && <StepSupporto />}
        {!isRivenditore && currentStep === 2 && <StepTexture />}
        {!isRivenditore && currentStep === 3 && <StepProtettivi />}

        {/* Flusso Rivenditore: Ambiente → Texture → Supporto (filtrato) → Protettivi → Review */}
        {isRivenditore && currentStep === 1 && <StepTexture />}
        {isRivenditore && currentStep === 2 && <StepSupportoRivenditore />}
        {isRivenditore && currentStep === 3 && <StepProtettivi />}

        {/* Riepilogo — uguale in entrambi i flussi */}
        {currentStep === reviewStep && <StepReview onComplete={handleComplete} />}
      </div>
    </div>
  );
}

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
              <div className="flex flex-col items-center">
                <span
                  className={`step-badge ${
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
                  className={`mt-1 text-center text-xs leading-tight ${
                    isActive ? 'font-semibold text-brand-700' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 ${
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
