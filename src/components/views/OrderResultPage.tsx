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
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'applicatore' | 'rivenditore'>('applicatore');

  function handleReset() {
    reset();
    onReset();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Scaletta tecnica</h1>
        <button type="button" className="btn-secondary" onClick={handleReset}>
          Nuovo configuratore
        </button>
      </div>

      {/* Tab — solo Admin vede entrambe le viste */}
      {isAdmin && (
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {(['applicatore', 'rivenditore'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Vista {tab}
            </button>
          ))}
        </div>
      )}

      {/* Vista Applicatore — default per tutti */}
      {(activeTab === 'applicatore' || !isAdmin) && (
        <VistaApplicatore result={result} />
      )}

      {/* Vista Rivenditore — solo Admin */}
      {isAdmin && activeTab === 'rivenditore' && (
        <VistaRivenditore result={result} />
      )}

      {/* Nota per rivenditore / applicatore */}
      {!isAdmin && (
        <div className="mt-6 text-center text-xs text-gray-400">
          Per confezioni, prezzi e carrello aggregato usa il modulo <strong>Progetto</strong>.
        </div>
      )}
    </div>
  );
}
