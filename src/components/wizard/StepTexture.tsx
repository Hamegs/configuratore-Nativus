import React, { useState } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { isEffectiveShower } from '../../engine/effective-ambiente';
import type { TextureLineId, TextureStyleId, ColorMode } from '../../types/enums';
import type { ColorSelection } from '../../types/texture';
import type { Surface } from '../../types/wizard-state';

const store = loadDataStore();

const LINE_CONSTRAINTS: Record<TextureLineId, { floor: boolean; wall: boolean; shower: boolean }> = {
  NATURAL: { floor: true, wall: true, shower: true },
  SENSE:   { floor: true, wall: true, shower: true },
  DEKORA:  { floor: true, wall: true, shower: false },
  LAMINE:  { floor: true, wall: true, shower: true },
  CORLITE: { floor: true, wall: false, shower: false },
  MATERIAL:{ floor: false, wall: true, shower: false },
};

function isSurfaceComplete(surface: Surface): boolean {
  const line = surface.texture_line;
  if (!line) return false;
  if ((line === 'NATURAL' || line === 'CORLITE') && !surface.texture_style) return false;
  if (line === 'LAMINE' && !surface.lamine_pattern) return false;
  if (['NATURAL', 'SENSE', 'DEKORA', 'CORLITE'].includes(line) && !surface.color_primary) return false;
  if ((surface.texture_style === 'ALIZEE_EVIDENCE_4' || surface.texture_style === 'COR_EVIDENCE') && !surface.color_secondary) return false;
  return true;
}

// ── Componente principale ─────────────────────────────────────────────────────
export function StepTexture() {
  const state = useWizardStore();
  const {
    mq_pareti,
    surfaces, walls_differentiated, setWallsDifferentiated, addWallPart, removeWallPart, updateSurface,
    active_blocks, nextStep, prevStep,
  } = state;

  const isShower = isEffectiveShower(state);
  const [newPartMq, setNewPartMq] = useState('');

  const wallSurfaces = surfaces.filter(s => s.type === 'WALL_PART');
  const usedWallMq   = wallSurfaces.reduce((acc, s) => acc + s.mq, 0);
  const remainingMq  = Math.round((mq_pareti - usedWallMq) * 100) / 100;

  const allComplete  = surfaces.length > 0 && surfaces.every(isSurfaceComplete);
  const wallSumOk    = !walls_differentiated || remainingMq <= 0.01;
  const isValid      = allComplete && wallSumOk && active_blocks.length === 0;

  function handleAddWallPart() {
    const mq = parseFloat(newPartMq);
    if (!isNaN(mq) && mq > 0 && mq <= remainingMq + 0.001) {
      addWallPart(parseFloat(mq.toFixed(2)));
      setNewPartMq('');
    }
  }

  return (
    <div className="space-y-8">
      <StepHeader title="Texture e colori" subtitle="Configura texture e colore per ogni superficie." />
      <BlockAlerts blocks={active_blocks} />

      {/* Differenziazione pareti */}
      {mq_pareti > 0 && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Configurazione pareti</h2>
          <p className="text-sm text-gray-500">Le pareti hanno la stessa texture e colore?</p>
          <div className="flex flex-wrap gap-3">
            {[
              { v: false, label: 'Sì — stessa texture per tutte le pareti' },
              { v: true,  label: 'No — texture diverse per porzioni di parete' },
            ].map(opt => (
              <label
                key={String(opt.v)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  walls_differentiated === opt.v
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:border-brand-300'
                }`}
              >
                <input
                  type="radio"
                  name="wall_diff"
                  checked={walls_differentiated === opt.v}
                  onChange={() => setWallsDifferentiated(opt.v)}
                  className="accent-brand-600"
                />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Aggiunta parti parete */}
          {walls_differentiated && (
            <div className="mt-2 space-y-3">
              <div className="text-xs text-gray-500 flex gap-3">
                <span>Totale pareti: <strong>{mq_pareti} m²</strong></span>
                <span>•</span>
                <span>
                  Rimanente:{' '}
                  <strong className={remainingMq < -0.01 ? 'text-red-600' : remainingMq <= 0.01 ? 'text-green-600' : 'text-amber-600'}>
                    {remainingMq.toFixed(2)} m²
                  </strong>
                </span>
              </div>
              {remainingMq > 0.01 && (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0.1" max={remainingMq} step="0.1"
                    placeholder={`m² parte (max ${remainingMq.toFixed(2)})`}
                    value={newPartMq}
                    onChange={e => setNewPartMq(e.target.value)}
                    className="input-field w-44"
                  />
                  <button type="button" onClick={handleAddWallPart} className="btn-secondary text-sm px-4 py-2">
                    + Aggiungi parte parete
                  </button>
                </div>
              )}
              {remainingMq <= 0.01 && wallSurfaces.length > 0 && (
                <p className="text-xs text-green-600 font-medium">Tutte le superfici parete sono state assegnate.</p>
              )}
              {remainingMq < -0.01 && (
                <p className="text-xs text-red-600">Somma m² superiore al totale pareti ({mq_pareti} m²).</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Configurazione per-superficie */}
      {surfaces.map((surface) => {
        const wallIdx = wallSurfaces.indexOf(surface);
        const label = surface.type === 'FLOOR'
          ? `Pavimento — ${surface.mq} m²`
          : walls_differentiated
            ? `Parete ${wallIdx + 1} — ${surface.mq} m²`
            : `Pareti — ${surface.mq} m²`;
        const canRemove = surface.type === 'WALL_PART' && walls_differentiated && wallSurfaces.length > 1;

        return (
          <SurfaceConfig
            key={surface.id}
            label={label}
            surface={surface}
            isFloor={surface.type === 'FLOOR'}
            isShower={isShower}
            canRemove={canRemove}
            onRemove={() => removeWallPart(surface.id)}
            onChange={patch => updateSurface(surface.id, patch)}
          />
        );
      })}

      {surfaces.length === 0 && (
        <div className="card p-6 text-center text-sm text-gray-500">
          Torna a "Superfici" e conferma i m² per sbloccare la configurazione texture.
        </div>
      )}

      <StepNavigation canContinue={isValid} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}

// ── SurfaceConfig ─────────────────────────────────────────────────────────────
interface SurfaceConfigProps {
  label: string;
  surface: Surface;
  isFloor: boolean;
  isShower: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (patch: Partial<Surface>) => void;
}

function SurfaceConfig({ label, surface, isFloor, isShower, canRemove, onRemove, onChange }: SurfaceConfigProps) {
  const line = surface.texture_line as TextureLineId | null;

  const filteredLines = store.textureLines.filter(l => {
    const c = LINE_CONSTRAINTS[l.line_id as TextureLineId];
    if (!c) return false;
    if (isFloor  && !c.floor) return false;
    if (!isFloor && !c.wall)  return false;
    if (isShower && !c.shower) return false;
    return true;
  });

  const stylesForLine = line
    ? store.textureStyles.filter(s => {
        if (line === 'CORLITE') return s.style_id.startsWith('COR_');
        if (['LAMINE', 'MATERIAL', 'DEKORA', 'SENSE'].includes(line)) return false;
        return !s.style_id.startsWith('COR_');
      })
    : [];

  const needsStyle    = line !== null && (line === 'NATURAL' || line === 'CORLITE');
  const needsPattern  = line === 'LAMINE';
  const needsColor    = line !== null && ['NATURAL', 'SENSE', 'DEKORA', 'CORLITE'].includes(line);
  const isBicolor     = surface.texture_style === 'ALIZEE_EVIDENCE_4' || surface.texture_style === 'COR_EVIDENCE';
  const ns            = surface.id; // namespace per radio name

  function handleLineChange(newLine: TextureLineId) {
    onChange({ texture_line: newLine, texture_style: null, color_mode: null, color_primary: null, color_secondary: null, lamine_pattern: null });
  }

  return (
    <section className="card p-6 space-y-6 border-2 border-gray-100 rounded-xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg text-gray-800">{label}</h2>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="text-xs border border-red-200 text-red-500 rounded px-2 py-1 hover:bg-red-50">
            Rimuovi
          </button>
        )}
      </div>

      {/* Linea texture */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Linea texture *</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filteredLines.map(l => (
            <label
              key={l.line_id}
              className={`flex cursor-pointer flex-col rounded-lg border-2 p-3 transition-colors ${
                line === l.line_id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
              }`}
            >
              <input type="radio" name={`line-${ns}`} value={l.line_id}
                checked={line === l.line_id}
                onChange={() => handleLineChange(l.line_id as TextureLineId)}
                className="sr-only"
              />
              <span className="font-semibold text-gray-800 text-sm">{l.line_id}</span>
              <span className="text-xs text-gray-500 mt-0.5">{l.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Stile */}
      {needsStyle && stylesForLine.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Stile *</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {stylesForLine.map(s => (
              <label
                key={s.style_id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 ${
                  surface.texture_style === s.style_id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
                }`}
              >
                <input type="radio" name={`style-${ns}`}
                  checked={surface.texture_style === s.style_id}
                  onChange={() => onChange({ texture_style: s.style_id as TextureStyleId, color_secondary: null })}
                  className="accent-brand-600"
                />
                <div>
                  <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.color_roles}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Pattern LAMINE */}
      {needsPattern && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Pattern LAMINE *</p>
          <select
            value={surface.lamine_pattern ?? ''}
            onChange={e => onChange({ lamine_pattern: e.target.value || null })}
            className="select-field"
          >
            <option value="">— Seleziona pattern —</option>
            {store.laminePatterns.map(p => (
              <option key={p.pattern_id} value={p.pattern_id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Colore principale */}
      {needsColor && (
        <ColorPickerSection
          key={`cp-${ns}-${line}`}
          label="Colore principale *"
          line={line!}
          namespace={`cp-${ns}`}
          value={surface.color_primary}
          onChange={v => onChange({ color_primary: v })}
        />
      )}

      {/* Colore 2 bicolor */}
      {isBicolor && (
        <ColorPickerSection
          key={`cs-${ns}-${surface.texture_style}`}
          label={surface.texture_style === 'COR_EVIDENCE' ? 'Colore 2 CORLITE (diverso dal 1) *' : 'Colore contrasto Alizeè *'}
          line={line!}
          namespace={`cs-${ns}`}
          value={surface.color_secondary}
          onChange={v => onChange({ color_secondary: v })}
        />
      )}

      {/* MATERIAL — colore superficiale */}
      {line === 'MATERIAL' && (
        <MaterialColorSection
          color_mode={surface.color_mode}
          color_primary={surface.color_primary}
          onChangeMode={v => onChange({ color_mode: v, color_primary: null })}
          onChangePrimary={v => onChange({ color_primary: v })}
        />
      )}
    </section>
  );
}

// ── ColorPickerSection ────────────────────────────────────────────────────────
function ColorPickerSection({
  label, line, namespace, value, onChange,
}: {
  label: string;
  line: string;
  namespace: string;
  value: ColorSelection | null;
  onChange: (v: ColorSelection | null) => void;
}) {
  const paletteMap: Record<string, typeof store.colorNatural24> = {
    NATURAL: store.colorNatural24,
    CORLITE: store.colorNatural24,
    SENSE:   store.colorSense24,
    DEKORA:  store.colorDekora24,
  };
  const palette  = paletteMap[line] ?? store.colorNatural24;
  const canCustom = line === 'NATURAL' || line === 'CORLITE';

  const [mode, setMode] = React.useState<'palette' | 'ral' | 'ncs' | 'pantone' | 'altro'>(
    value?.type as never ?? 'palette',
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      {canCustom && (
        <div className="flex gap-2 flex-wrap">
          {(['palette', 'ral', 'ncs', 'pantone', 'altro'] as const).map(m => (
            <button key={m} type="button"
              onClick={() => { setMode(m); onChange(null); }}
              className={`rounded px-3 py-1 text-xs font-medium border transition-colors ${
                mode === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {m === 'palette' ? 'Cartella' : m.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {mode === 'palette' && (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto sm:grid-cols-4">
          {palette.filter(c => c.is_active).map(c => (
            <label
              key={c.color_id}
              className={`flex cursor-pointer items-center gap-1.5 rounded border p-2 text-xs transition-colors ${
                value?.color_id === c.color_id
                  ? 'border-brand-500 bg-brand-50 font-medium'
                  : 'border-gray-100 hover:border-brand-300'
              }`}
            >
              <input
                type="radio"
                name={`color_${namespace}`}
                checked={value?.color_id === c.color_id}
                onChange={() => onChange({ type: c.palette_id as ColorSelection['type'], color_id: c.color_id, label: c.label })}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {mode === 'ral' && (
        <select value={value?.code ?? ''}
          onChange={e => {
            const ral = store.colorRal.find(r => r.ral_code === e.target.value);
            if (ral) onChange({ type: 'RAL', code: ral.ral_code, label: ral.ral_label });
          }}
          className="select-field"
        >
          <option value="">— Seleziona RAL —</option>
          {store.colorRal.filter(r => r.is_active).map(r => (
            <option key={r.ral_id} value={r.ral_code}>{r.ral_label}</option>
          ))}
        </select>
      )}

      {mode === 'ncs' && (
        <select value={value?.code ?? ''}
          onChange={e => {
            const ncs = store.colorNcs.find(c => c.ncs_code === e.target.value);
            if (ncs) onChange({ type: 'NCS', code: ncs.ncs_code, label: ncs.ncs_label });
          }}
          className="select-field"
        >
          <option value="">— Seleziona NCS —</option>
          {store.colorNcs.filter(c => c.is_active).slice(0, 500).map(c => (
            <option key={c.ncs_id} value={c.ncs_code}>{c.ncs_label}</option>
          ))}
        </select>
      )}

      {mode === 'pantone' && (
        <select value={value?.code ?? ''}
          onChange={e => {
            const p = store.colorPantone.find(c => c.pantone_code === e.target.value);
            if (p) onChange({ type: 'PANTONE_C', code: p.pantone_code, label: p.pantone_label });
          }}
          className="select-field"
        >
          <option value="">— Seleziona Pantone C —</option>
          {store.colorPantone.filter(c => c.is_active).slice(0, 500).map(c => (
            <option key={c.pantone_id} value={c.pantone_code}>{c.pantone_label}</option>
          ))}
        </select>
      )}

      {mode === 'altro' && (
        <input
          type="text"
          placeholder="Inserisci codice colore (es. B12, verde salvia...)"
          value={value?.label ?? ''}
          onChange={e => onChange({ type: 'ALTRO', label: e.target.value })}
          className="input-field"
        />
      )}
    </div>
  );
}

// ── MaterialColorSection ──────────────────────────────────────────────────────
function MaterialColorSection({
  color_mode, color_primary, onChangeMode, onChangePrimary,
}: {
  color_mode: ColorMode | null;
  color_primary: ColorSelection | null;
  onChangeMode: (v: ColorMode) => void;
  onChangePrimary: (v: ColorSelection | null) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Colore superficiale MATERIAL (opzionale)</p>
      <p className="text-xs text-gray-500">MATERIAL è neutro di base. Il colore è applicato in superficie, non in massa.</p>
      <div className="flex gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" name="mat_color_mode" checked={color_mode !== 'CUSTOM_FEE0'}
            onChange={() => { onChangeMode('NEUTRO'); onChangePrimary(null); }}
            className="accent-brand-600" />
          Senza colore
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" name="mat_color_mode" checked={color_mode === 'CUSTOM_FEE0'}
            onChange={() => onChangeMode('CUSTOM_FEE0')}
            className="accent-brand-600" />
          Con colore superficiale
        </label>
      </div>
      {color_mode === 'CUSTOM_FEE0' && (
        <>
          <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Attenzione: colore in superficie, NON in massa. Far accettare al cliente prima di procedere.
          </div>
          <select
            value={color_primary?.type ?? ''}
            onChange={e => {
              if (e.target.value === 'NATURAL_24') onChangePrimary({ type: 'NATURAL_24', label: 'Nordcolor Art (cartella Natural)' });
              else if (e.target.value === 'ALTRO')   onChangePrimary({ type: 'ALTRO', label: 'DekorArt W' });
            }}
            className="select-field"
          >
            <option value="">— Seleziona prodotto colore —</option>
            <option value="NATURAL_24">Nordcolor Art NCS/RAL (250 g/m², conf. 1 kg)</option>
            <option value="ALTRO">Dekor Art W (250 g/m², conf. 1 kg)</option>
          </select>
        </>
      )}
    </div>
  );
}
