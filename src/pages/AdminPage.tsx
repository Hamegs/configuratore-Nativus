import React, { useState, useEffect } from 'react';
import { loadDataStore, invalidateCache } from '../utils/data-loader';
import { useAdminStore } from '../store/admin-store';
import { AdminListino } from '../components/admin/AdminListino';
import { AdminStratigrafie } from '../components/admin/AdminStratigrafie';

type Tab = 'riepilogo' | 'stratigrafie' | 'listino';

const TABS: { id: Tab; label: string }[] = [
  { id: 'riepilogo', label: 'Riepilogo' },
  { id: 'stratigrafie', label: 'Stratigrafie' },
  { id: 'listino', label: 'Listino' },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('riepilogo');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { overrides, loadFromStorage, resetAll } = useAdminStore();

  useEffect(() => { loadFromStorage(); }, []);

  let store: ReturnType<typeof loadDataStore>;
  try {
    store = loadDataStore();
  } catch {
    return <div className="p-8 text-red-600">Errore caricamento dati.</div>;
  }

  function handleRefresh() {
    setError(null);
    try {
      invalidateCache();
      loadDataStore();
      setInfo('Cache dati ricaricata.');
      setTimeout(() => setInfo(null), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    }
  }

  function handleReset() {
    if (!confirm('Ripristinare tutti i dati originali? Tutte le modifiche admin andranno perse.')) return;
    resetAll();
    setInfo('Dati originali ripristinati.');
    setTimeout(() => setInfo(null), 2500);
  }

  const hasOverrides = Object.values(overrides).some(v => Array.isArray(v));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pannello Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Gestione stratigrafie, listino e parametri di sistema.</p>
        </div>
        <div className="flex gap-2 items-center">
          {info && <span className="text-xs text-green-600 font-medium">{info}</span>}
          {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
          <button type="button" className="btn-secondary text-xs" onClick={handleRefresh}>Ricarica cache</button>
          {hasOverrides && (
            <button type="button" className="btn-secondary text-xs text-red-600 border-red-300 hover:bg-red-50" onClick={handleReset}>
              Ripristina dati originali
            </button>
          )}
        </div>
      </div>

      {hasOverrides && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Dati personalizzati attivi: {[
            overrides.stepLibrary ? `step-library (${overrides.stepLibrary.length})` : null,
            overrides.stepMap ? `step-map (${overrides.stepMap.length})` : null,
            overrides.packagingSku ? `packaging (${overrides.packagingSku.length})` : null,
            overrides.listino ? `listino (${overrides.listino.length})` : null,
          ].filter(Boolean).join(', ')}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'riepilogo' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: 'Ambienti', value: store.ambienti.length },
            { label: 'Supporti', value: store.supporti.length },
            { label: 'Regole DT', value: store.decisionTable.length },
            { label: 'Step-map', value: store.stepMap.length },
            { label: 'Step library', value: store.stepLibrary.length },
            { label: 'SKU packaging', value: store.packagingSku.length },
            { label: 'SKU listino', value: store.listino.length },
            { label: 'Texture lines', value: store.textureLines.length },
            { label: 'Texture styles', value: store.textureStyles.length },
            { label: 'LAMINE pattern', value: store.laminePatterns.length },
            { label: 'DIN inputs', value: store.dinInputs.length },
            { label: 'DIN order rules', value: store.dinOrderRules.length },
            { label: 'RAL Classic', value: store.colorRal.length },
            { label: 'NCS', value: store.colorNcs.length },
            { label: 'Pantone C', value: store.colorPantone.length },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl font-bold text-brand-700">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'stratigrafie' && <AdminStratigrafie store={store} />}
      {tab === 'listino' && <AdminListino store={store} />}
    </div>
  );
}
