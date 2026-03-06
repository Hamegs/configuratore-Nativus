import React, { useState, useEffect } from 'react';
import { loadDataStore, invalidateCache } from '../utils/data-loader';
import { useAdminStore } from '../store/admin-store';
import { AdminListino } from '../components/admin/AdminListino';
import { AdminStratigrafie } from '../components/admin/AdminStratigrafie';
import { AdminExport } from '../components/admin/AdminExport';
import { AdminProdotti } from '../components/admin/AdminProdotti';
import { AdminRiepilogo } from '../components/admin/AdminRiepilogo';
import { AdminMedia } from '../components/admin/AdminMedia';
import { AdminCMSEnvironments } from '../components/admin/AdminCMSEnvironments';
import { AdminCMSSupports } from '../components/admin/AdminCMSSupports';
import { AdminCMSTools } from '../components/admin/AdminCMSTools';
import { AdminApplicationSteps } from '../components/admin/AdminApplicationSteps';
import { AdminStratigraphyManual } from '../components/admin/AdminStratigraphyManual';
import { AdminOperationalSheets } from '../components/admin/AdminOperationalSheets';

type Tab =
  | 'riepilogo'
  | 'stratigrafie'
  | 'listino'
  | 'prodotti'
  | 'export'
  | 'media'
  | 'environments'
  | 'supports'
  | 'tools'
  | 'steps'
  | 'manuals'
  | 'sheets';

const TABS: { id: Tab; label: string; group?: string }[] = [
  { id: 'riepilogo', label: 'Riepilogo', group: 'engine' },
  { id: 'stratigrafie', label: 'Stratigrafie', group: 'engine' },
  { id: 'listino', label: 'Listino', group: 'engine' },
  { id: 'prodotti', label: 'Prodotti', group: 'engine' },
  { id: 'export', label: 'Export', group: 'engine' },
  { id: 'media', label: 'Media', group: 'cms' },
  { id: 'environments', label: 'Ambienti CMS', group: 'cms' },
  { id: 'supports', label: 'Supporti CMS', group: 'cms' },
  { id: 'tools', label: 'Strumenti', group: 'cms' },
  { id: 'steps', label: 'Passi app.', group: 'cms' },
  { id: 'manuals', label: 'Manuali strat.', group: 'cms' },
  { id: 'sheets', label: 'Schede op.', group: 'cms' },
];

const TAB_TITLES: Record<Tab, string> = {
  riepilogo: 'Riepilogo dati',
  stratigrafie: 'Stratigrafie',
  listino: 'Listino prezzi',
  prodotti: 'Prodotti',
  export: 'Export dati',
  media: 'Libreria media',
  environments: 'Configurazione ambienti',
  supports: 'Tipi supporto',
  tools: 'Strumenti applicazione',
  steps: 'Passi applicazione',
  manuals: 'Manuali stratigrafici',
  sheets: 'Schede operative',
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('riepilogo');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { overrides, loadFromStorage, resetAll } = useAdminStore();

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

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

  const hasOverrides = Object.values(overrides).some(v =>
    Array.isArray(v)
      ? v.length > 0
      : typeof v === 'object' && v !== null && Object.keys(v).length > 0
  );

  const overrideSummary = [
    overrides.stepLibrary?.length ? `step-library (${overrides.stepLibrary.length})` : null,
    overrides.stepMap?.length ? `step-map (${overrides.stepMap.length})` : null,
    overrides.packagingSku?.length ? `packaging (${overrides.packagingSku.length})` : null,
    overrides.listino?.length ? `listino (${overrides.listino.length})` : null,
    overrides.ambienti?.length ? `ambienti (${overrides.ambienti.length})` : null,
    overrides.supporti?.length ? `supporti (${overrides.supporti.length})` : null,
    overrides.dinInputs?.length ? `din-inputs (${overrides.dinInputs.length})` : null,
    overrides.dinOrderRules?.length ? `din-rules (${overrides.dinOrderRules.length})` : null,
    overrides.textureLines?.length ? `texture-lines (${overrides.textureLines.length})` : null,
    overrides.textureStyles?.length ? `texture-styles (${overrides.textureStyles.length})` : null,
    overrides.laminePatterns?.length ? `lamine (${overrides.laminePatterns.length})` : null,
    overrides.commercialNames && Object.keys(overrides.commercialNames).length > 0
      ? `nomi (${Object.keys(overrides.commercialNames).length})` : null,
    overrides.colorOverrides && Object.keys(overrides.colorOverrides).length > 0
      ? `colori (${Object.keys(overrides.colorOverrides).length})` : null,
  ].filter(Boolean).join(', ');

  function navigateTo(targetTab: string) {
    if (TABS.some(t => t.id === targetTab)) {
      setTab(targetTab as Tab);
    }
  }

  const engineTabs = TABS.filter(t => t.group === 'engine');
  const cmsTabs = TABS.filter(t => t.group === 'cms');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pannello Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Gestione motore, listino, media e contenuti CMS.</p>
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
          Dati personalizzati attivi: {overrideSummary}
        </div>
      )}

      <div style={{ borderBottom: '1px solid #e2e4e0' }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c9aaa', paddingLeft: 2 }}>Motore &amp; Dati</span>
        </div>
        <nav style={{ display: 'flex', gap: 0, marginBottom: -1, flexWrap: 'wrap' }}>
          {engineTabs.map(t => (
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

        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c9aaa', paddingLeft: 2 }}>CMS Contenuti</span>
        </div>
        <nav style={{ display: 'flex', gap: 0, marginBottom: -1, flexWrap: 'wrap' }}>
          {cmsTabs.map(t => (
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

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#171e29', marginBottom: 16 }}>{TAB_TITLES[tab]}</h2>

        {tab === 'riepilogo' && <AdminRiepilogo store={store} onNavigateTab={navigateTo} />}
        {tab === 'stratigrafie' && <AdminStratigrafie store={store} />}
        {tab === 'listino' && <AdminListino store={store} />}
        {tab === 'prodotti' && <AdminProdotti store={store} />}
        {tab === 'export' && <AdminExport />}
        {tab === 'media' && <AdminMedia />}
        {tab === 'environments' && <AdminCMSEnvironments />}
        {tab === 'supports' && <AdminCMSSupports />}
        {tab === 'tools' && <AdminCMSTools />}
        {tab === 'steps' && <AdminApplicationSteps />}
        {tab === 'manuals' && <AdminStratigraphyManual />}
        {tab === 'sheets' && <AdminOperationalSheets />}
      </div>
    </div>
  );
}
