import React from 'react';
import { useProjectStore } from '../../store/project-store';

interface SalesLayoutProps {
  children: React.ReactNode;
}

export function SalesLayout({ children }: SalesLayoutProps) {
  const { cart_total_optimized, cart_total_separate, cart_savings_eur } = useProjectStore(s => ({
    cart_total_optimized: s.cart_total_optimized,
    cart_total_separate: s.cart_total_separate,
    cart_savings_eur: s.cart_savings_eur,
  }));

  const hasSavings = cart_savings_eur > 0.5;

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-gray-50">
      <div className="border-b border-blue-100 bg-white px-6 py-2 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700 tracking-widest uppercase">
              Modalità Vendita
            </span>
            <span className="text-xs text-gray-400">Preventivo commerciale · Ottimizzazione confezioni</span>
          </div>
          {hasSavings && (
            <div className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1">
              <span className="text-xs font-semibold text-green-700">
                Risparmio ottimizzato: +{cart_savings_eur.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1">{children}</div>
      {cart_total_optimized > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-3 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Totale Ottimizzato</span>
                <div className="text-xl font-bold text-gray-900">
                  {cart_total_optimized.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              </div>
              {hasSavings && (
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">vs Separato</span>
                  <div className="text-sm font-medium text-gray-600 line-through">
                    {cart_total_separate.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                </div>
              )}
            </div>
            {hasSavings && (
              <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-1.5">
                <span className="text-sm font-bold text-green-700">
                  Risparmio: {cart_savings_eur.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
