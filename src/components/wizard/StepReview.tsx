import React, { useState, useEffect } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { computeFullCart, computeTechnicalSchedule } from '../../engine/cart-calculator';
import type { CartResult, TechnicalSchedule } from '../../engine/cart-calculator';

const store = loadDataStore();

interface StepReviewProps {
  onComplete: (result: CartResult) => void;
  completeLabel?: string;
}

const SECTION_COLORS: Record<string, string> = {
  'PREPARAZIONE SUPPORTO': 'border-stone-400 bg-stone-50',
  'TEXTURE': 'border-brand-400 bg-brand-50',
  'PROTETTIVO': 'border-teal-400 bg-teal-50',
};

const SECTION_ICON: Record<string, string> = {
  'PREPARAZIONE SUPPORTO': '🔧',
  'TEXTURE': '🎨',
  'PROTETTIVO': '🛡️',
};

export function StepReview({ onComplete, completeLabel = 'Aggiungi al carrello' }: StepReviewProps) {
  const state = useWizardStore();
  const { active_blocks, prevStep } = state;
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<TechnicalSchedule | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasBlocks = active_blocks.length > 0;
  const isValid = !hasBlocks;

  useEffect(() => {
    if (!isValid) return;
    setScheduleError(null);
    try {
      const s = computeTechnicalSchedule(store, state);
      setSchedule(s);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore calcolo procedura';
      setScheduleError(msg);
    }
  }, [state.supporto_floor, state.supporto_wall, state.texture_line, state.texture_style, state.protettivo, isValid]);

  function handleAddToCart() {
    setError(null);
    setLoading(true);
    try {
      const result = computeFullCart(store, state);
      onComplete(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore sconosciuto';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <StepHeader
        title="Scaletta tecnica"
        subtitle="Procedura di applicazione. Nessun calcolo di confezioni o prezzi — quelli vengono generati nel carrello."
      />
      <BlockAlerts blocks={active_blocks} />

      {error && (
        <div className="alert-hard">
          <strong>Errore motore:</strong> {error}
        </div>
      )}

      {scheduleError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Anteprima procedura non disponibile:</strong> {scheduleError}
        </div>
      )}

      {/* Scaletta tecnica — solo nomi prodotti per sezione */}
      {schedule && schedule.sections.length > 0 && (
        <div className="space-y-4">
          {schedule.sections.map((section) => (
            <div
              key={section.title}
              className={`rounded-xl border-l-4 p-4 ${SECTION_COLORS[section.title] ?? 'border-gray-300 bg-gray-50'}`}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2">
                <span>{SECTION_ICON[section.title] ?? '•'}</span>
                {section.title}
              </h3>
              <ol className="space-y-1.5">
                {section.products.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-gray-300 text-xs flex items-center justify-center font-medium text-gray-500">
                      {i + 1}
                    </span>
                    <span>{p.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {schedule.hard_alerts.length > 0 && (
            <div className="space-y-2">
              {schedule.hard_alerts.map((a, i) => (
                <div key={i} className="alert-hard text-sm">{a}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottoni */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={prevStep}
        >
          ← Modifica configurazione
        </button>
        <button
          type="button"
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={!isValid || loading}
          onClick={handleAddToCart}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {completeLabel}
        </button>
      </div>
    </div>
  );
}
