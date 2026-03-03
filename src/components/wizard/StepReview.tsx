import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { computeTechnicalSchedule } from '../../engine/cart-calculator';
import { loadDataStore } from '../../utils/data-loader';
import { StepHeader, StepNavigation } from './StepAmbiente';
import type { WizardState } from '../../types/wizard-state';
import { preparationUpgradeConfig } from '../../engine/preparation-upgrade';

const TEXTURE_LINE_LABELS: Record<string, string> = {
  NATURAL: 'Natural', NATURAL_ALIZEE: 'Natural Alizée', SENSE: 'Sense',
  DEKORA: 'Dekora', LAMINE: 'Lamine', CORLITE_CHROMO: 'Corlite Chromo',
  CORLITE_EVIDENCE: 'Corlite Evidence', MATERIAL: 'Material',
};
const SURFACE_TYPE_LABELS: Record<string, string> = {
  FLOOR: 'Pavimento', WALL_PART: 'Parete',
};

const RAS2K_OPTIONS: { val: WizardState['ras2k_upgrade']; label: string; desc: string }[] = [
  { val: 'KEEP',       label: 'Rasante 2K',          desc: 'Standard — 32,5 kg · 13 m²/mano' },
  { val: 'RAS_BASE',   label: 'Rasante Base',         desc: "Monocomponente pronto all'uso" },
  { val: 'RAS_BASE_Q', label: 'Rasante Base Quarzo',  desc: 'Bicomp impermeabile — prestazioni superiori' },
];

export function StepReview() {
  const state = useWizardStore();
  const store = loadDataStore();
  const { nextStep, ras2k_upgrade, setRas2kUpgrade, preparation_upgrade, setPreparationUpgrade } = state;

  let schedule: ReturnType<typeof computeTechnicalSchedule> | null = null;
  let computeError: string | null = null;
  try {
    schedule = computeTechnicalSchedule(store, state);
  } catch (e) {
    computeError = e instanceof Error ? e.message : 'Errore calcolo';
  }

  const prepSection   = schedule?.sections.find(s => s.title.toUpperCase().includes('PREPARAZIONE'));
  const protSection   = schedule?.sections.find(s => s.title.toUpperCase().includes('PROTETTIVO'));
  const hasRas2kAlert = schedule?.hard_alerts?.some(a => a.includes('RAS') || a.includes('2K'));

  // Rileva layer di base dalla sezione preparazione (dopo tutti i modifiers)
  type DetectedBase = 'RAS_2K' | 'RAS_BASE' | 'RAS_BASE_Q';
  let detectedBase: DetectedBase | null = null;
  for (const prod of prepSection?.products ?? []) {
    if (prod.name.includes('Quarzo'))                 { detectedBase = 'RAS_BASE_Q'; break; }
    if (prod.name.includes('2K'))                     { detectedBase = 'RAS_2K';     break; }
    if (prod.name.toLowerCase().includes('rasante'))  { detectedBase = 'RAS_BASE';   break; }
  }
  const upgradeOptions = detectedBase && detectedBase !== 'RAS_BASE_Q'
    ? Object.entries(preparationUpgradeConfig[detectedBase] ?? {})
    : [];
  const showPrepUpgrade = upgradeOptions.length > 0;

  const surfaces    = state.surfaces;
  const hasSurfaces = surfaces.length > 0;

  return (
    <div className="space-y-6">
      <StepHeader
        title="Riepilogo Tecnico"
        subtitle="Scaletta operativa completa. Nessun prezzo — solo sequenza di applicazione."
      />

      {computeError && <div className="alert-hard">Errore motore: {computeError}</div>}
      {schedule?.hard_alerts?.map((a, i) => (
        <div key={i} className="alert-warn">{a}</div>
      ))}

      {/* ── Upgrade Rasante 2K (legacy) ───────────────────────────────── */}
      {(hasRas2kAlert || ras2k_upgrade !== 'KEEP') && (
        <div className="card p-5">
          <p className="mb-3 text-sm font-semibold text-brand-800">Scelta rasante parete</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {RAS2K_OPTIONS.map(opt => (
              <button
                key={opt.val}
                onClick={() => setRas2kUpgrade(opt.val)}
                className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${
                  ras2k_upgrade === opt.val
                    ? 'border-brand-600 bg-brand-50 shadow-sm'
                    : 'border-sand-400 bg-sand-100 hover:border-brand-300'
                }`}
              >
                <p className={`text-sm font-semibold ${ras2k_upgrade === opt.val ? 'text-brand-700' : 'text-brand-800'}`}>
                  {opt.label}
                </p>
                <p className="mt-0.5 text-xs text-brand-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Upgrade strato di preparazione ────────────────────────────── */}
      {showPrepUpgrade && (
        <div className="card p-5">
          <p className="mb-1 text-sm font-semibold text-brand-800">Aggiorna strato di preparazione</p>
          <p className="mb-3 text-xs text-brand-500">
            Base attuale: <strong>{
              detectedBase === 'RAS_2K' ? 'Rasante 2K' :
              detectedBase === 'RAS_BASE' ? 'Rasante Base' : ''
            }</strong>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {/* Opzione: mantieni standard */}
            <button
              onClick={() => setPreparationUpgrade('KEEP')}
              className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${
                preparation_upgrade === 'KEEP'
                  ? 'border-brand-600 bg-brand-50 shadow-sm'
                  : 'border-sand-400 bg-sand-100 hover:border-brand-300'
              }`}
            >
              <p className={`text-sm font-semibold ${preparation_upgrade === 'KEEP' ? 'text-brand-700' : 'text-brand-800'}`}>
                Preparazione Standard
              </p>
              <p className="mt-0.5 text-xs text-brand-500">Mantieni la base attuale</p>
            </button>

            {/* Opzioni upgrade dalla config */}
            {upgradeOptions.map(([key, opt]) => (
              <button
                key={key}
                onClick={() => setPreparationUpgrade(key as WizardState['preparation_upgrade'])}
                className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${
                  preparation_upgrade === key
                    ? 'border-brand-600 bg-brand-50 shadow-sm'
                    : 'border-sand-400 bg-sand-100 hover:border-brand-300'
                }`}
              >
                <p className={`text-sm font-semibold ${preparation_upgrade === key ? 'text-brand-700' : 'text-brand-800'}`}>
                  {opt.marketing_label}
                </p>
                <p className="mt-0.5 text-xs text-brand-500">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── A • Preparazione Supporto ─────────────────────────────────── */}
      {prepSection && prepSection.products.length > 0 && (
        <div className="card overflow-hidden">
          <div className="tbl-head">
            <span className="section-number mr-2">A</span>
            {prepSection.title}
          </div>
          <ul className="divide-y divide-sand-300">
            {prepSection.products.map((prod, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-brand-800">{prod.name}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── B • Texture ───────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="tbl-head">
          <span className="section-number mr-2">B</span>
          Texture
        </div>
        {hasSurfaces ? (
          <ul className="divide-y divide-sand-300">
            {surfaces.map((surf, i) => {
              const lineName  = surf.texture_line ? (TEXTURE_LINE_LABELS[surf.texture_line] ?? surf.texture_line) : '—';
              const colorName = surf.color_primary?.label ?? surf.color_secondary?.label ?? '';
              const typeLabel = SURFACE_TYPE_LABELS[surf.type] ?? surf.type;
              return (
                <li key={surf.id ?? i} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-brand-800">
                      {lineName}{colorName ? ` — ${colorName}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-500">
                      {typeLabel} · {surf.mq} m²
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : state.texture_line ? (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">
              {TEXTURE_LINE_LABELS[state.texture_line] ?? state.texture_line}
              {state.color_primary?.label ? ` — ${state.color_primary.label}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-brand-500">
              {(state.mq_pavimento + state.mq_pareti).toFixed(1)} m² totali
            </p>
          </div>
        ) : (
          <p className="px-4 py-3 text-sm text-brand-400">Nessuna texture configurata.</p>
        )}
      </div>

      {/* ── C • Protettivo ────────────────────────────────────────────── */}
      {(protSection?.products.length || state.protettivo) && (
        <div className="card overflow-hidden">
          <div className="tbl-head">
            <span className="section-number mr-2">C</span>
            Protettivo
          </div>
          {protSection?.products.length ? (
            <ul className="divide-y divide-sand-300">
              {protSection.products.map((prod, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-brand-800">{prod.name}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm text-brand-700">
                {state.protettivo?.system ?? 'Protettivo'} — {state.protettivo?.finitura ?? ''}
                {state.finish_type ? ` · ${state.finish_type === 'OPACO' ? 'Opaco' : 'Lucido'}` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      <StepNavigation
        canGoBack
        canGoNext={!computeError}
        nextLabel="Vai al Carrello →"
        onNext={nextStep}
      />
    </div>
  );
}
