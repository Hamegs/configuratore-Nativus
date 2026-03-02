import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { isEffectiveShower } from '../../engine/effective-ambiente';
import type { ProtectionSystem } from '../../types/enums';
import type { ProtettivoSelection } from '../../types/protettivi';

const store = loadDataStore();

const FINITURA_OPTIONS: Array<{ value: string; label: string; systems: ProtectionSystem[]; lines: string[] }> = [
  { value: 'OPACO', label: 'Opaco', systems: ['H2O', 'S'], lines: ['NATURAL', 'SENSE', 'DEKORA', 'LAMINE', 'CORLITE', 'MATERIAL'] },
  { value: 'LUCIDO', label: 'Lucido', systems: ['H2O', 'S'], lines: ['NATURAL', 'SENSE', 'DEKORA', 'LAMINE'] },
  { value: 'CERA_LUCIDA', label: 'Cera Lucida (SEAL WAX)', systems: ['H2O'], lines: ['CORLITE'] },
  { value: 'PROTEGGO_COLOR_OPACO', label: 'PROTEGGO Color Opaco H2O (colorato)', systems: ['H2O'], lines: ['NATURAL', 'SENSE', 'DEKORA'] },
];

type ColorSource = 'NATURAL_24' | 'RAL' | 'NCS' | 'PANTONE_C' | 'ALTRO';

export function StepProtettivi() {
  const state = useWizardStore();
  const { protettivo, setProtettivo, texture_line, mq_pavimento, mq_pareti, active_blocks, nextStep, prevStep } = state;

  const isShower = isEffectiveShower(state);
  const defaultUso = isShower
    ? 'BAGNO_DOCCIA'
    : mq_pavimento > 0
    ? 'PAVIMENTO'
    : 'PARETE_FUORI_BAGNO';

  const sel = protettivo ?? {
    system: 'H2O' as ProtectionSystem,
    finitura: 'OPACO',
    uso_superficie: defaultUso,
    opaco_colorato: false,
  } as ProtettivoSelection;

  function update(patch: Partial<ProtettivoSelection>) {
    setProtettivo({ ...sel, ...patch } as ProtettivoSelection);
  }

  const isMaterial = texture_line === 'MATERIAL';
  const availableSystems: ProtectionSystem[] = isMaterial ? ['H2O'] : ['H2O', 'S'];
  const availableFinitura = FINITURA_OPTIONS.filter(f =>
    f.systems.includes(sel.system) && f.lines.includes(texture_line ?? ''),
  );

  const needsTrasparentefinale = sel.finitura === 'PROTEGGO_COLOR_OPACO';
  const needsProteggoColor = sel.finitura === 'PROTEGGO_COLOR_OPACO';
  const isValid =
    !!protettivo &&
    !!protettivo.system &&
    !!protettivo.finitura &&
    (!needsTrasparentefinale || !!sel.trasparente_finale) &&
    (!needsProteggoColor || !!sel.colore_source) &&
    active_blocks.length === 0;

  return (
    <div className="space-y-8">
      <StepHeader title="Protettivi" subtitle="Scegli il sistema di finitura e il tipo di protettivo." />
      <BlockAlerts blocks={active_blocks} />

      {/* Sistema */}
      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Sistema *</h2>
        {isMaterial && <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">MATERIAL: solo sistema base acqua (H₂O).</p>}
        <div className="flex gap-4">
          {availableSystems.map(s => (
            <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-5 py-3 text-sm font-medium transition-colors ${sel.system === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-300 text-gray-700'}`}>
              <input type="radio" name="system" checked={sel.system === s} onChange={() => update({ system: s, finitura: 'OPACO', colore_source: undefined, colore_code: undefined })} className="accent-brand-600" />
              {s === 'H2O' ? 'Base acqua (H₂O)' : 'Solvente (S)'}
            </label>
          ))}
        </div>
      </section>

      {/* Finitura */}
      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Finitura *</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availableFinitura.map(f => (
            <label key={f.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${sel.finitura === f.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'}`}>
              <input type="radio" name="finitura" checked={sel.finitura === f.value} onChange={() => update({ finitura: f.value as ProtettivoSelection['finitura'], opaco_colorato: false, colore_source: undefined, colore_code: undefined, trasparente_finale: undefined })} className="accent-brand-600" />
              <span className="text-sm font-medium text-gray-800">{f.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Colore per PROTEGGO Color Opaco H2O */}
      {sel.finitura === 'PROTEGGO_COLOR_OPACO' && (
        <ProtettivoColorSection
          source={sel.colore_source as ColorSource | undefined}
          code={sel.colore_code}
          onChange={(source, code) => update({ colore_source: source, colore_code: code })}
        />
      )}

      {/* Mano trasparente finale dopo Color Opaco H2O */}
      {sel.finitura === 'PROTEGGO_COLOR_OPACO' && (
        <section className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Mano trasparente finale *</h2>
          <select value={sel.trasparente_finale ?? ''} onChange={e => update({ trasparente_finale: e.target.value as ProtettivoSelection['trasparente_finale'] })} className="select-field">
            <option value="">— Seleziona —</option>
            <option value="OPACO_H2O">Opaco H2O</option>
            <option value="LUCIDO_H2O">Lucido H2O</option>
          </select>
        </section>
      )}

      {/* Colore opaco S */}
      {sel.system === 'S' && sel.finitura === 'OPACO' && (
        <section className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Opaco S colorato?</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={sel.opaco_colorato} onChange={e => update({ opaco_colorato: e.target.checked })} className="accent-brand-600" />
            Sì, con premix colore (1 premix per confezione Opaco S)
          </label>
        </section>
      )}

      <StepNavigation canContinue={isValid} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}

function ProtettivoColorSection({
  source,
  code,
  onChange,
}: {
  source: ColorSource | undefined;
  code: string | undefined;
  onChange: (source: string, code: string | undefined) => void;
}) {
  const COLOR_MODES: Array<{ id: ColorSource; label: string }> = [
    { id: 'NATURAL_24', label: 'Cartella Natural' },
    { id: 'RAL', label: 'RAL' },
    { id: 'NCS', label: 'NCS' },
    { id: 'PANTONE_C', label: 'Pantone C' },
    { id: 'ALTRO', label: 'Altro' },
  ];

  return (
    <section className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">Sistema colore PROTEGGO Color Opaco *</h2>
      <p className="text-xs text-gray-500">Seleziona da quale sistema colore viene scelto il colore del protettivo colorato.</p>
      <div className="flex gap-2 flex-wrap">
        {COLOR_MODES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id, undefined)}
            className={`rounded px-3 py-1.5 text-xs font-medium border transition-colors ${
              source === m.id
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {source === 'NATURAL_24' && (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto sm:grid-cols-4">
          {store.colorNatural24.filter(c => c.is_active).map(c => (
            <label
              key={c.color_id}
              className={`flex cursor-pointer items-center gap-1.5 rounded border p-2 text-xs transition-colors ${
                code === c.color_id
                  ? 'border-brand-500 bg-brand-50 font-medium'
                  : 'border-gray-100 hover:border-brand-300'
              }`}
            >
              <input
                type="radio"
                name="prot_color"
                checked={code === c.color_id}
                onChange={() => onChange('NATURAL_24', c.color_id)}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {source === 'RAL' && (
        <select
          value={code ?? ''}
          onChange={e => onChange('RAL', e.target.value || undefined)}
          className="select-field"
        >
          <option value="">— Seleziona RAL —</option>
          {store.colorRal.filter(r => r.is_active).map(r => (
            <option key={r.ral_id} value={r.ral_code}>{r.ral_label}</option>
          ))}
        </select>
      )}

      {source === 'NCS' && (
        <select
          value={code ?? ''}
          onChange={e => onChange('NCS', e.target.value || undefined)}
          className="select-field"
        >
          <option value="">— Seleziona NCS —</option>
          {store.colorNcs.filter(c => c.is_active).slice(0, 500).map(c => (
            <option key={c.ncs_id} value={c.ncs_code}>{c.ncs_label}</option>
          ))}
        </select>
      )}

      {source === 'PANTONE_C' && (
        <select
          value={code ?? ''}
          onChange={e => onChange('PANTONE_C', e.target.value || undefined)}
          className="select-field"
        >
          <option value="">— Seleziona Pantone C —</option>
          {store.colorPantone.filter(c => c.is_active).slice(0, 500).map(c => (
            <option key={c.pantone_id} value={c.pantone_code}>{c.pantone_label}</option>
          ))}
        </select>
      )}

      {source === 'ALTRO' && (
        <input
          type="text"
          placeholder="Inserisci codice/descrizione colore (es. B12, verde salvia...)"
          value={code ?? ''}
          onChange={e => onChange('ALTRO', e.target.value || undefined)}
          className="input-field"
        />
      )}
    </section>
  );
}
