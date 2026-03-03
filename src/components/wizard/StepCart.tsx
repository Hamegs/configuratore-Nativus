import React, { useEffect, useMemo, useState } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { computeFullCart } from '../../engine/cart-calculator';
import { buildCartFromAggregated } from '../../engine/packaging-optimizer';
import { loadDataStore } from '../../utils/data-loader';
import { formatEur } from '../../utils/format';
import { StepHeader, StepNavigation } from './StepAmbiente';
import type { CartResult } from '../../engine/cart-calculator';
import type { PackagingStrategy, ProjectCartRow, AggregatedRawQty } from '../../types/project';
import type { CartLine } from '../../types/cart';

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
  SUPPORTO:   'A • Preparazione supporto',
  TEXTURE:    'B • Texture',
  PROTETTIVO: 'C • Protettivo',
  DIN:        'DIN 18534',
};
const SECTION_ORDER = ['SUPPORTO', 'TEXTURE', 'PROTETTIVO', 'DIN'];

export function StepCart({ onComplete }: StepCartProps) {
  const state = useWizardStore();
  const store = loadDataStore();

  const [strategy, setStrategy]     = useState<PackagingStrategy>('MINIMO_SFRIDO');
  const [cartResult, setCartResult] = useState<CartResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    try {
      setCartResult(computeFullCart(store, state));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore calcolo carrello');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aggregated = useMemo((): AggregatedRawQty[] => {
    if (!cartResult) return [];
    return cartResult.summary.lines.map((line: CartLine) => ({
      product_id: line.product_id ?? line.sku_id,
      sku_id_default: line.sku_id,
      descrizione: line.descrizione,
      qty_raw: line.qty_raw ?? line.qty,
      pack_size_default: line.pack_size ?? 1,
      pack_unit: line.pack_unit ?? 'kg',
      section: line.section,
      from_rooms: [],
    }));
  }, [cartResult]);

  const rows: ProjectCartRow[] = useMemo(
    () => (aggregated.length > 0
      ? buildCartFromAggregated(aggregated, store.packagingSku, store.listino, strategy)
      : []),
    [aggregated, strategy]
  );

  const rowsBySection = useMemo(() => {
    const map: Partial<Record<string, ProjectCartRow[]>> = {};
    for (const row of rows) {
      const sec = (row as ProjectCartRow & { section?: string }).section ?? 'SUPPORTO';
      if (!map[sec]) map[sec] = [];
      map[sec]!.push(row);
    }
    return map;
  }, [rows]);

  const total  = rows.reduce((acc, r) => acc + r.totale, 0);
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
      {rows.length === 0 && !error && (
        <div className="card p-6 text-center text-sm text-brand-400">
          Nessun materiale calcolato. Verifica la configurazione nel Riepilogo tecnico.
        </div>
      )}

      {SECTION_ORDER.filter(sec => (rowsBySection[sec]?.length ?? 0) > 0).map(sec => (
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
              {(rowsBySection[sec] ?? []).map(row => (
                <tr key={row.row_id} className="tbl-row">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-800">{row.descrizione}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-700">
                    {row.qty_packs} × {row.pack_size} {row.pack_unit}
                  </td>
                  <td className="px-4 py-3 text-right text-brand-600 hidden sm:table-cell">
                    {row.prezzo_unitario > 0 ? formatEur(row.prezzo_unitario) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold price-text">
                    {row.totale > 0 ? formatEur(row.totale) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ── Totale ──────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
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
        canGoNext={!!cartResult && rows.length > 0}
        nextLabel="Aggiungi al Carrello Progetto"
        onNext={handleConfirm}
      />
    </div>
  );
}
