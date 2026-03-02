import React, { useEffect } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { isEffectiveShower } from '../../engine/effective-ambiente';
import type { ProtectionSystem } from '../../types/enums';
import type { ProtettivoSelection } from '../../types/protettivi';

const store = loadDataStore();

type ColorSource = 'NATURAL_24' | 'RAL' | 'NCS' | 'PANTONE_C' | 'ALTRO';

export function StepProtettivi() {
  const state = useWizardStore();
  const {
    protettivo, setProtettivo, texture_line, mq_pavimento, active_blocks, nextStep, prevStep,
    surfaces, protector_mode, finish_type, setProtectorMode, setFinishType, updateSurface,
  } = state;

  const isShower = isEffectiveShower(state);
  const defaultUso = isShower ? 'BAGNO_DOCCIA' : mq_pavimento > 0 ? 'PAVIMENTO' : 'PARETE_FUORI_BAGNO';

  // Deriva texture_line primaria per definire le opzioni protettivo
  const primaryLine = surfaces.length > 0
    ? (surfaces.find(s => s.texture_line)?.texture_line ?? texture_line)
    : texture_line;

  const sel: ProtettivoSelection = protettivo ?? {
    system: 'H2O' as ProtectionSystem,
    finitura: 'OPACO',
    uso_superficie: defaultUso,
    opaco_colorato: false,
  };

  function update(patch: Partial<ProtettivoSelection>) {
    setProtettivo({ ...sel, ...patch } as ProtettivoSelection);
  }

  useEffect(() => {
    if (!protettivo) setProtettivo({ ...sel } as ProtettivoSelection);
  }, []);

  const isMaterial = primaryLine === 'MATERIAL';
  const isCorlite  = primaryLine === 'CORLITE';
  const isLamine   = primaryLine === 'LAMINE';
  const isSpecial  = isCorlite || isLamine;
  const availableSystems: ProtectionSystem[] = isMaterial ? ['H2O'] : ['H2O', 'S'];

  function handleModeChange(mode: 'TRASPARENTE' | 'COLOR') {
    setProtectorMode(mode);
    if (mode === 'TRASPARENTE') {
      update({ finitura: finish_type === 'LUCIDO' ? 'LUCIDO' : 'OPACO', opaco_colorato: false, colore_source: undefined, colore_code: undefined });
    } else {
      if (sel.system === 'H2O') {
        update({ finitura: 'PROTEGGO_COLOR_OPACO', opaco_colorato: false });
      } else {
        update({ finitura: 'OPACO', opaco_colorato: true });
      }
    }
  }

  function handleFinishChange(ft: 'OPACO' | 'LUCIDO') {
    setFinishType(ft);
    if (protector_mode === 'TRASPARENTE') update({ finitura: ft });
  }

  const allSurfacesHaveColor = surfaces.length === 0 || protector_mode !== 'COLOR' ||
    surfaces.every(s => !!s.protector_color);
  const needsTrasparentefinale = protector_mode === 'COLOR' && sel.system === 'H2O';
  const isValid =
    !!sel.system && !!finish_type &&
    (!needsTrasparentefinale || !!sel.trasparente_finale) &&
    allSurfacesHaveColor &&
    active_blocks.length === 0;

  const wallSurfaces = surfaces.filter(s => s.type === 'WALL_PART');

  return (
    <div className="space-y-8">
      <StepHeader title="Protettivi" subtitle="Sistema, modalità e finitura del protettivo." />
      <BlockAlerts blocks={active_blocks} />

      {/* Sistema */}
      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Sistema *</h2>
        {isMaterial && <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">MATERIAL: solo sistema base acqua (H₂O).</p>}
        <div className="flex flex-wrap gap-3">
          {availableSystems.map(s => (
            <label key={s}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-5 py-3 text-sm font-medium transition-colors ${
                sel.system === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-300 text-gray-700'
              }`}
            >
              <input type="radio" name="system" checked={sel.system === s}
                onChange={() => update({ system: s, finitura: 'OPACO', colore_source: undefined, colore_code: undefined, opaco_colorato: false })}
                className="accent-brand-600"
              />
              {s === 'H2O' ? 'Base acqua (H₂O)' : 'Solvente (S)'}
            </label>
          ))}
        </div>
      </section>

      {/* Modalità protettivo (solo linee non-speciali) */}
      {!isSpecial && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Modalità protettivo *</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { v: 'TRASPARENTE' as const, label: 'Trasparente', desc: 'PROTEGGO Fix + Opaco o Lucido' },
              { v: 'COLOR' as const,       label: 'PROTEGGO Color', desc: 'Colore nel protettivo — configurabile per superficie' },
            ].map(opt => (
              <label key={opt.v}
                className={`flex cursor-pointer flex-col rounded-lg border-2 px-5 py-3 text-sm font-medium transition-colors ${
                  protector_mode === opt.v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-brand-300'
                }`}
              >
                <input type="radio" name="protector_mode" checked={protector_mode === opt.v}
                  onChange={() => handleModeChange(opt.v)} className="sr-only" />
                <span className="font-semibold">{opt.label}</span>
                <span className="text-xs font-normal text-gray-500 mt-0.5">{opt.desc}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Finitura — TRASPARENTE e linee non-speciali */}
      {protector_mode === 'TRASPARENTE' && !isSpecial && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Finitura *</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { v: 'OPACO' as const,  label: 'Opaco',  always: true },
              { v: 'LUCIDO' as const, label: 'Lucido', always: false },
            ]
              .filter(opt => opt.always || sel.system === 'H2O' || sel.system === 'S')
              .map(opt => (
                <label key={opt.v}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-5 py-3 text-sm font-medium transition-colors ${
                    finish_type === opt.v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-300 text-gray-700'
                  }`}
                >
                  <input type="radio" name="finish_type" checked={finish_type === opt.v}
                    onChange={() => handleFinishChange(opt.v)} className="accent-brand-600" />
                  {opt.label}
                </label>
              ))
            }
          </div>
        </section>
      )}

      {/* Finitura CORLITE */}
      {isCorlite && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Finitura CORLITE *</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'OPACO' as const,      label: 'Opaco H₂O  (2 mani PROTEGGO Opaco)' },
              { value: 'CERA_LUCIDA' as const, label: 'Lucida (SEAL WAX 2 mani)' },
            ].map(f => (
              <label key={f.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  sel.finitura === f.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
                }`}
              >
                <input type="radio" name="finitura_corlite" checked={sel.finitura === f.value}
                  onChange={() => update({ finitura: f.value, opaco_colorato: false })}
                  className="accent-brand-600" />
                {f.label}
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Finitura LAMINE */}
      {isLamine && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Finitura LAMINE *</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'OPACO' as const,  label: 'Opaco (a rullo)' },
              { value: 'LUCIDO' as const, label: 'Lucido (dopo spatola lucido)' },
            ].map(f => (
              <label key={f.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  sel.finitura === f.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
                }`}
              >
                <input type="radio" name="finitura_lamine" checked={sel.finitura === f.value}
                  onChange={() => update({ finitura: f.value })} className="accent-brand-600" />
                {f.label}
              </label>
            ))}
          </div>
        </section>
      )}

      {/* COLOR mode — colore protettivo per superficie */}
      {protector_mode === 'COLOR' && surfaces.length > 0 && (
        <section className="card p-6 space-y-6">
          <h2 className="font-semibold text-gray-800">Colore protettivo per superficie *</h2>
          <p className="text-xs text-gray-500">
            Seleziona il colore PROTEGGO Color per ogni superficie configurata.
          </p>
          {surfaces.map(surface => {
            const wallIdx   = wallSurfaces.indexOf(surface);
            const lbl = surface.type === 'FLOOR'
              ? `Pavimento — ${surface.mq} m²`
              : `Parete ${wallIdx + 1} — ${surface.mq} m²`;
            return (
              <div key={surface.id} className="space-y-3 border-l-4 border-brand-200 pl-4">
                <p className="text-sm font-semibold text-gray-700">{lbl}</p>
                <ProtettivoColorSection
                  source={surface.protector_color?.type as ColorSource | undefined}
                  code={surface.protector_color?.code ?? surface.protector_color?.label}
                  onChange={(src, code) =>
                    updateSurface(surface.id, { protector_color: { type: src as any, code, label: code ?? src } })
                  }
                />
              </div>
            );
          })}
        </section>
      )}

      {/* COLOR mode legacy — backward compat quando surfaces.length === 0 */}
      {protector_mode === 'COLOR' && surfaces.length === 0 && (
        <ProtettivoColorSection
          source={sel.colore_source as ColorSource | undefined}
          code={sel.colore_code}
          onChange={(source, code) => update({ colore_source: source, colore_code: code })}
        />
      )}

      {/* Mano trasparente finale (COLOR H2O) */}
      {needsTrasparentefinale && (
        <section className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Mano trasparente finale *</h2>
          <select value={sel.trasparente_finale ?? ''}
            onChange={e => update({ trasparente_finale: e.target.value as ProtettivoSelection['trasparente_finale'] })}
            className="select-field"
          >
            <option value="">— Seleziona —</option>
            <option value="OPACO_H2O">Opaco H2O</option>
            <option value="LUCIDO_H2O">Lucido H2O</option>
          </select>
        </section>
      )}

      {/* Opaco S colorato — backward compat */}
      {sel.system === 'S' && sel.finitura === 'OPACO' && surfaces.length === 0 && (
        <section className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Opaco S colorato?</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={sel.opaco_colorato}
              onChange={e => update({ opaco_colorato: e.target.checked })}
              className="accent-brand-600" />
            Sì, con premix colore (1 premix per confezione Opaco S)
          </label>
        </section>
      )}

      <StepNavigation canContinue={isValid} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}

// ── ProtettivoColorSection ────────────────────────────────────────────────────
function ProtettivoColorSection({
  source, code, onChange,
}: {
  source: ColorSource | undefined;
  code: string | undefined;
  onChange: (source: string, code: string | undefined) => void;
}) {
  const COLOR_MODES: Array<{ id: ColorSource; label: string }> = [
    { id: 'NATURAL_24', label: 'Cartella Natural' },
    { id: 'RAL',        label: 'RAL' },
    { id: 'NCS',        label: 'NCS' },
    { id: 'PANTONE_C',  label: 'Pantone C' },
    { id: 'ALTRO',      label: 'Altro' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {COLOR_MODES.map(m => (
          <button key={m.id} type="button" onClick={() => onChange(m.id, undefined)}
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
            <label key={c.color_id}
              className={`flex cursor-pointer items-center gap-1.5 rounded border p-2 text-xs transition-colors ${
                code === c.color_id ? 'border-brand-500 bg-brand-50 font-medium' : 'border-gray-100 hover:border-brand-300'
              }`}
            >
              <input type="radio" name={`prot_color_${source}`} checked={code === c.color_id}
                onChange={() => onChange('NATURAL_24', c.color_id)} className="sr-only" />
              {c.label}
            </label>
          ))}
        </div>
      )}
      {source === 'RAL' && (
        <select value={code ?? ''} onChange={e => onChange('RAL', e.target.value || undefined)} className="select-field">
          <option value="">— Seleziona RAL —</option>
          {store.colorRal.filter(r => r.is_active).map(r => <option key={r.ral_id} value={r.ral_code}>{r.ral_label}</option>)}
        </select>
      )}
      {source === 'NCS' && (
        <select value={code ?? ''} onChange={e => onChange('NCS', e.target.value || undefined)} className="select-field">
          <option value="">— Seleziona NCS —</option>
          {store.colorNcs.filter(c => c.is_active).slice(0, 500).map(c => <option key={c.ncs_id} value={c.ncs_code}>{c.ncs_label}</option>)}
        </select>
      )}
      {source === 'PANTONE_C' && (
        <select value={code ?? ''} onChange={e => onChange('PANTONE_C', e.target.value || undefined)} className="select-field">
          <option value="">— Seleziona Pantone C —</option>
          {store.colorPantone.filter(c => c.is_active).slice(0, 500).map(c => <option key={c.pantone_id} value={c.pantone_code}>{c.pantone_label}</option>)}
        </select>
      )}
      {source === 'ALTRO' && (
        <input type="text" placeholder="Inserisci codice/descrizione colore"
          value={code ?? ''} onChange={e => onChange('ALTRO', e.target.value || undefined)} className="input-field" />
      )}
    </div>
  );
}
