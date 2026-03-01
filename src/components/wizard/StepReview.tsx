import React, { useState } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { computeFullCart } from '../../engine/cart-calculator';
import type { CartResult } from '../../engine/cart-calculator';
import { ambienteLabel, formatEur } from '../../utils/formatters';

const store = loadDataStore();

interface StepReviewProps {
  onComplete: (result: CartResult) => void;
  completeLabel?: string;
}

export function StepReview({ onComplete, completeLabel = 'Genera ordine' }: StepReviewProps) {
  const state = useWizardStore();
  const { active_blocks, prevStep } = state;
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    try {
      const result = computeFullCart(store, state);
      onComplete(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore sconosciuto';
      setError(msg);
    }
  }

  const hasBlocks = active_blocks.length > 0;
  const isValid = !hasBlocks;

  return (
    <div className="space-y-8">
      <StepHeader title="Riepilogo" subtitle="Verifica le scelte prima di generare l'ordine." />
      <BlockAlerts blocks={active_blocks} />

      {error && (
        <div className="alert-hard">
          <strong>Errore motore:</strong> {error}
        </div>
      )}

      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-800 mb-4">Scelte configurate</h2>
        <ReviewRow label="Ambiente" value={state.ambiente ? ambienteLabel(state.ambiente, state.room_type_display) : '—'} />
        <ReviewRow label="Pavimento" value={state.mq_pavimento > 0 ? `${state.mq_pavimento} m²` : '—'} />
        <ReviewRow label="Pareti" value={state.mq_pareti > 0 ? `${state.mq_pareti} m²` : '—'} />
        {state.supporto_floor && (
          <ReviewRow label="Supporto pavimento" value={store.supporti.find(s => s.support_id === state.supporto_floor)?.name ?? state.supporto_floor} />
        )}
        {state.supporto_wall && (
          <ReviewRow label="Supporto parete" value={store.supporti.find(s => s.support_id === state.supporto_wall)?.name ?? state.supporto_wall} />
        )}
        <ReviewRow label="Texture" value={state.texture_line ?? '—'} />
        {state.texture_style && <ReviewRow label="Stile" value={state.texture_style} />}
        {state.lamine_pattern && <ReviewRow label="Pattern LAMINE" value={store.laminePatterns.find(p => p.pattern_id === state.lamine_pattern)?.name ?? state.lamine_pattern} />}
        {state.color_primary && <ReviewRow label="Colore primario" value={state.color_primary.label} />}
        {state.color_secondary && <ReviewRow label="Colore secondario" value={state.color_secondary.label} />}
        {state.protettivo && (
          <>
            <ReviewRow label="Sistema protettivo" value={state.protettivo.system} />
            <ReviewRow label="Finitura" value={state.protettivo.finitura} />
          </>
        )}
      </section>

      <StepNavigation
        canContinue={isValid}
        onNext={handleGenerate}
        onPrev={prevStep}
        nextLabel={completeLabel}
        isLastStep
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
