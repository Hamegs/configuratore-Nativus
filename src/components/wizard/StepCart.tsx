import React, { useEffect, useMemo, useState } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { computeFullCart } from '../../engine/cart-calculator';
import { computeTechnicalGroups } from '../../services/technical';
import { computePackagedItems } from '../../services/packaging';
import { useCartStore } from '../../store/cart-store';
import { loadDataStore } from '../../utils/data-loader';
import { formatEur } from '../../utils/format';
import { StepHeader, StepNavigation } from './StepAmbiente';
import type { CartResult } from '../../engine/cart-calculator';
import type { PackagingStrategy } from '../../types/project';
import type { PackagedItem } from '../../types/services';
import type { TechnicalGroupEnriched } from '../../services/technical';

interface StepCartProps {
  onComplete: (result: CartResult, strategy: PackagingStrategy) => void;
}

const STRATEGIES: {
  id: PackagingStrategy;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { id: 'MINIMO_SFRIDO',     label: 'Min. Sfrido',     desc: 'Minimizza eccesso',     icon: '◎' },
  { id: 'ECONOMICO',         label: 'Economico',        desc: 'Miglior prezzo totale', icon: '€' },
  { id: 'CONFEZIONI_GRANDI', label: 'Conf. Grandi',     desc: 'Formato grande',        icon: '▲' },
  { id: 'MANUALE',           label: 'Manuale',          desc: 'Scegli tu',             icon: '✎' },
];

const SECTION_LABELS: Record<string, string> = {
  fondo:      'A • Preparazione supporto',
  texture:    'B • Texture',
  protettivi: 'C • Protettivo',
  din:        'DIN 18534',
  speciale:   'Speciali',
};
const SECTION_ORDER = ['fondo', 'texture', 'protettivi', 'din', 'speciale'];

export function StepCart({ onComplete }: StepCartProps) {
  const state = useWizardStore();
  const store = loadDataStore();
  const { setItems: setCartItems } = useCartStore();

  const [strategy, setStrategy]       = useState<PackagingStrategy>('MINIMO_SFRIDO');
  const [cartResult, setCartResult]   = useState<CartResult | null>(null);
  const [groups, setGroups]           = useState<TechnicalGroupEnriched[]>([]);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    try {
      const g = computeTechnicalGroups(state, store);
      setGroups(g);
      setCartResult(computeFullCart(store, state));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore calcolo carrello');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items: PackagedItem[] = useMemo(() => {
    if (groups.length === 0) return [];
    try {
      const computed = computePackagedItems(groups, store, strategy);
      setCartItems(computed);
      return computed;
    } catch (e) {
      console.error('[StepCart] computePackagedItems error:', e);
      return [];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, strategy]);

  const itemsBySection = useMemo(() => {
    const map: Partial<Record<string, PackagedItem[]>> = {};
    for (const item of items) {
      if (!map[item.section]) map[item.section] = [];
      map[item.section]!.push(item);
    }
    return map;
  }, [items]);

  const total  = items.reduce((acc, i) => acc + i.totale, 0);
  const alerts = cartResult?.computation_errors ?? [];

  function handleConfirm() {
    if (!cartResult) return;
    onComplete(cartResult, strategy);
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="Carrello"
        subtitle="Scegli la strategia di confezionamento e aggiungi al progetto."
      />

      {error && <div className="alert-hard">{error}</div>}
      {alerts.map((a, i) => <div key={i} className="alert-hard">{a.text}</div>)}

      {/* ── Strategy cards ──────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-sm font-semibold text-brand-800">Strategia confezioni</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              onClick={() => setStrategy(s.id)}
              className={`flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border-2 p-4 text-center transition-all ${
                strategy === s.id
                  ? 'border-brand-600 bg-brand-50 shadow-md'
                  : 'border-sand-400 bg-sand-100 hover:border-brand-300 hover:bg-sand-50'
              }`}
            >
              <span className={`text-2xl leading-none ${strategy === s.id ? 'text-brand-600' : 'text-brand-300'}`}>
                {s.icon}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wide ${
                strategy === s.id ? 'text-brand-700' : 'text-brand-600'
              }`}>
                {s.label}
              </span>
              <span className="text-[10px] text-brand-400">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Cart lines by section ────────────────────────────────────────── */}
      {items.length === 0 && !error && (
        <div className="card p-6 text-center text-sm text-brand-400">
          Nessun materiale calcolato. Verifica la configurazione nel Riepilogo tecnico.
        </div>
      )}

      {SECTION_ORDER.filter(sec => (itemsBySection[sec]?.length ?? 0) > 0).map(sec => (
        <div key={sec} className="card overflow-hidden">
          <div className="tbl-head">{SECTION_LABELS[sec] ?? sec}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand-100 text-xs uppercase text-brand-500">
                <th className="px-4 py-2 text-left">Prodotto</th>
                <th className="px-4 py-2 text-right">Confezioni</th>
                <th className="px-4 py-2 text-right hidden sm:table-cell">Prezzo unit.</th>
                <th className="px-4 py-2 text-right font-semibold">Totale</th>
              </tr>
            </thead>
            <tbody>
              {(itemsBySection[sec] ?? []).map(item => (
                <tr key={item.row_id} className="tbl-row">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-800">{item.nomeCommerciale}</p>
                    {item.description !== item.nomeCommerciale && (
                      <p className="text-xs text-brand-500 mt-0.5">{item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-700">
                    {item.qty_packs} × {item.pack_size} {item.pack_unit}
                  </td>
                  <td className="px-4 py-3 text-right text-brand-600 hidden sm:table-cell">
                    {item.prezzo_unitario > 0 ? formatEur(item.prezzo_unitario) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold price-text">
                    {item.totale > 0 ? formatEur(item.totale) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ── Totale ──────────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex justify-end rounded-xl border-2 border-brand-600 bg-brand-50 px-6 py-4">
          <div className="text-right">
            <p className="text-xs text-brand-500">
              Totale stimato · {STRATEGIES.find(s => s.id === strategy)?.label}
            </p>
            <p className="text-2xl font-bold text-accent">{formatEur(total)}</p>
            <p className="text-xs text-brand-400">IVA esclusa</p>
          </div>
        </div>
      )}

      <StepNavigation
        canGoBack
        canGoNext={!!cartResult && items.length > 0}
        nextLabel="Aggiungi al Carrello Progetto"
        onNext={handleConfirm}
      />
    </div>
  );
}
