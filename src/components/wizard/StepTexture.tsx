import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { isEffectiveShower } from '../../engine/effective-ambiente';
import type { TextureLineId, TextureStyleId } from '../../types/enums';
import type { ColorSelection } from '../../types/texture';

const store = loadDataStore();

const LINE_CONSTRAINTS: Record<TextureLineId, { floor: boolean; wall: boolean; shower: boolean }> = {
  NATURAL: { floor: true, wall: true, shower: true },
  SENSE: { floor: true, wall: true, shower: true },
  DEKORA: { floor: true, wall: true, shower: false },
  LAMINE: { floor: true, wall: true, shower: true },
  CORLITE: { floor: true, wall: false, shower: false },
  MATERIAL: { floor: false, wall: true, shower: false },
};

export function StepTexture() {
  const state = useWizardStore();
  const {
    mq_pavimento, mq_pareti,
    texture_line, setTextureLine,
    texture_style, setTextureStyle,
    color_mode, setColorMode,
    color_primary, setColorPrimary,
    color_secondary, setColorSecondary,
    lamine_pattern, setLaminePattern,
    active_blocks, nextStep, prevStep,
  } = state;

  // Use effectiveAmbiente to correctly detect shower (BAG + presenza_doccia → DOC)
  const isShower = isEffectiveShower(state);
  const hasFloor = mq_pavimento > 0;
  const hasWall  = mq_pareti > 0;

  const filteredLines = store.textureLines.filter(l => {
    const c = LINE_CONSTRAINTS[l.line_id as TextureLineId];
    if (!c) return false;
    if (hasFloor && !c.floor) return false;
    if (hasWall && !c.wall) return false;
    if (isShower && !c.shower) return false;
    return true;
  });

  const selectedLine = texture_line ? LINE_CONSTRAINTS[texture_line] : null;
  const stylesForLine = texture_line
    ? store.textureStyles.filter(s => {
        if (texture_line === 'CORLITE') return s.style_id.startsWith('COR_');
        if (texture_line === 'LAMINE') return false;
        if (texture_line === 'MATERIAL') return false;
        if (texture_line === 'DEKORA') return false;
        if (texture_line === 'SENSE') return false;
        return !s.style_id.startsWith('COR_');
      })
    : [];

  const isLamine = texture_line === 'LAMINE';
  const isMaterial = texture_line === 'MATERIAL';
  const needsStyle = !isLamine && !isMaterial && texture_line !== null && texture_line !== 'DEKORA' && texture_line !== 'SENSE';
  const needsPattern = isLamine;

  const isBicolor = texture_style === 'ALIZEE_EVIDENCE_4' || texture_style === 'COR_EVIDENCE';
  const needsColorPrimary = ['NATURAL', 'SENSE', 'DEKORA', 'CORLITE'].includes(texture_line ?? '');
  const needsColorSecondary = isBicolor;
  const needsMaterialColorProduct = isMaterial && color_mode === 'CUSTOM_FEE0' && color_primary === null;

  const isValid =
    texture_line !== null &&
    (!needsStyle || texture_style !== null) &&
    (!needsPattern || lamine_pattern !== null) &&
    (!needsColorPrimary || color_primary !== null) &&
    (!needsColorSecondary || color_secondary !== null) &&
    !needsMaterialColorProduct &&
    active_blocks.length === 0;

  return (
    <div className="space-y-8">
      <StepHeader title="Linea texture" subtitle="Seleziona la texture e il colore." />
      <BlockAlerts blocks={active_blocks} />

      {/* Texture Line */}
      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Linea texture *</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredLines.map(l => (
            <label
              key={l.line_id}
              className={`flex cursor-pointer flex-col rounded-lg border-2 p-3 transition-colors ${
                texture_line === l.line_id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-brand-300'
              }`}
            >
              <input
                type="radio"
                name="texture_line"
                value={l.line_id}
                checked={texture_line === l.line_id}
                onChange={() => setTextureLine(l.line_id as TextureLineId)}
                className="sr-only"
              />
              <span className="font-semibold text-gray-800">{l.line_id}</span>
              <span className="text-xs text-gray-500 mt-0.5">{l.name}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Style */}
      {needsStyle && stylesForLine.length > 0 && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Stile *</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stylesForLine.map(s => (
              <label
                key={s.style_id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 ${
                  texture_style === s.style_id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-brand-300'
                }`}
              >
                <input
                  type="radio"
                  name="texture_style"
                  checked={texture_style === s.style_id}
                  onChange={() => setTextureStyle(s.style_id as TextureStyleId)}
                  className="accent-brand-600"
                />
                <div>
                  <p className="font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.color_roles}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Pattern LAMINE */}
      {needsPattern && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Pattern LAMINE *</h2>
          <select
            value={lamine_pattern ?? ''}
            onChange={e => setLaminePattern(e.target.value || null)}
            className="select-field"
          >
            <option value="">— Seleziona pattern —</option>
            {store.laminePatterns.map(p => (
              <option key={p.pattern_id} value={p.pattern_id}>{p.name}</option>
            ))}
          </select>
        </section>
      )}

      {/* Colore 1 */}
      {['NATURAL', 'SENSE', 'DEKORA', 'CORLITE'].includes(texture_line ?? '') && (
        <ColorPickerSection
          label="Colore principale *"
          line={texture_line!}
          value={color_primary}
          onChange={setColorPrimary}
        />
      )}

      {/* Colore 2 — bicolor */}
      {(texture_style === 'ALIZEE_EVIDENCE_4' || texture_style === 'COR_EVIDENCE') && (
        <ColorPickerSection
          label={texture_style === 'COR_EVIDENCE' ? 'Colore 2 CORLITE (diverso dal 1) *' : 'Colore contrasto Alizeè *'}
          line={texture_line!}
          value={color_secondary}
          onChange={setColorSecondary}
        />
      )}

      {/* MATERIAL colore superficiale */}
      {isMaterial && (
        <MaterialColorSection />
      )}

      <StepNavigation canContinue={isValid} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}

function ColorPickerSection({
  label,
  line,
  value,
  onChange,
}: {
  label: string;
  line: string;
  value: ColorSelection | null;
  onChange: (v: ColorSelection | null) => void;
}) {
  const paletteMap: Record<string, typeof store.colorNatural24> = {
    NATURAL: store.colorNatural24,
    CORLITE: store.colorNatural24,
    SENSE: store.colorSense24,
    DEKORA: store.colorDekora24,
  };
  const palette = paletteMap[line] ?? store.colorNatural24;
  const canCustom = line === 'NATURAL' || line === 'CORLITE';

  const [mode, setMode] = React.useState<'palette' | 'ral' | 'ncs' | 'pantone' | 'altro'>(
    value?.type as never ?? 'palette',
  );

  return (
    <section className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">{label}</h2>

      {canCustom && (
        <div className="flex gap-2 flex-wrap">
          {(['palette', 'ral', 'ncs', 'pantone', 'altro'] as const).map(m => (
            <button
              key={m}
              type="button"
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
                name={`color_${label}`}
                checked={value?.color_id === c.color_id}
                onChange={() => onChange({ type: `${c.palette_id}` as ColorSelection['type'], color_id: c.color_id, label: c.label })}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {mode === 'ral' && (
        <select
          value={value?.code ?? ''}
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
        <select
          value={value?.code ?? ''}
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
        <select
          value={value?.code ?? ''}
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
    </section>
  );
}

function MaterialColorSection() {
  const { color_mode, setColorMode, color_primary, setColorPrimary } = useWizardStore();

  return (
    <section className="card p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">Colore superficiale MATERIAL (opzionale)</h2>
      <p className="text-xs text-gray-500">MATERIAL è neutro di base. Il colore è in superficie, non in massa.</p>
      <div className="flex gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" name="mat_color" checked={color_mode !== 'CUSTOM_FEE0'} onChange={() => { setColorMode('NEUTRO'); setColorPrimary(null); }} className="accent-brand-600" />
          Senza colore
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" name="mat_color" checked={color_mode === 'CUSTOM_FEE0'} onChange={() => setColorMode('CUSTOM_FEE0')} className="accent-brand-600" />
          Con colore superficiale
        </label>
      </div>
      {color_mode === 'CUSTOM_FEE0' && (
        <>
          <div className="alert-warn text-xs">Attenzione: colore in superficie, NON in massa. Far accettare al cliente.</div>
          <select
            value={color_primary?.type ?? ''}
            onChange={e => {
              if (e.target.value === 'NATURAL_24') setColorPrimary({ type: 'NATURAL_24', label: 'Nordcolor Art (cartella Natural)' });
              else if (e.target.value === 'ALTRO') setColorPrimary({ type: 'ALTRO', label: 'DekorArt W' });
            }}
            className="select-field"
          >
            <option value="">— Seleziona prodotto colore —</option>
            <option value="NATURAL_24">Nordcolor Art NCS/RAL (250 g/m², 1 kg)</option>
            <option value="ALTRO">Dekor Art W (250 g/m², 1 kg)</option>
          </select>
        </>
      )}
    </section>
  );
}
