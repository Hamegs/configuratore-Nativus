import React, { useState } from 'react';
import { useAuthStore } from '../../store/auth-store';
import type { CartResult } from '../../engine/cart-calculator';
import { VistaRivenditore } from './VistaRivenditore';
import { VistaApplicatore } from './VistaApplicatore';
import { useWizardStore } from '../../store/wizard-store';

interface OrderResultPageProps {
  result: CartResult;
  onReset: () => void;
}

export function OrderResultPage({ result, onReset }: OrderResultPageProps) {
  const { user } = useAuthStore();
  const { reset } = useWizardStore();
  const isApplicatore = user?.role === 'applicatore';

  // Applicatore vede solo la procedura; rivenditore e admin vedono entrambe le viste
  const defaultTab = isApplicatore ? 'applicatore' : 'rivenditore';
  const [activeTab, setActiveTab] = useState<'applicatore' | 'rivenditore'>(defaultTab);

  function handleReset() {
    reset();
    onReset();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {isApplicatore ? 'Scaletta tecnica' : 'Riepilogo ordine'}
        </h1>
        <button type="button" className="btn-secondary" onClick={handleReset}>
          Nuovo configuratore
        </button>
      </div>

      {/* Tab di navigazione — visibile a tutti tranne applicatore puro */}
      {!isApplicatore && (
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {[
            { id: 'rivenditore', label: 'Carrello / Prezzi' },
            { id: 'applicatore', label: 'Vista Applicatore' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'rivenditore' && !isApplicatore && (
        <VistaRivenditore result={result} />
      )}

      {(activeTab === 'applicatore' || isApplicatore) && (
        <VistaApplicatore result={result} />
      )}
    </div>
  );
}
