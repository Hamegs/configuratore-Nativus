import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { ApplicationStepManual } from '../../types/cms';
import { loadDataStore } from '../../utils/data-loader';
import type { StepLibraryEntry } from '../../types/step';

const STEP_TYPE_LABELS: Record<string, string> = {
  MECH: 'Meccanico',
  PRIMER: 'Primer',
  BASE: 'Base',
  TEXTURE: 'Texture',
  PROT: 'Protettivo',
  REPAIR: 'Riparazione',
  FIX: 'Fix',
};

export function AdminApplicationSteps() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [steps, setSteps] = useState<StepLibraryEntry[]>([]);
  const [manualsMap, setManualsMap] = useState<Record<string, ApplicationStepManual>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ApplicationStepManual>>({});
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const store = loadDataStore();
    setSteps(store.stepLibrary);
    const map: Record<string, ApplicationStepManual> = {};
    for (const m of cms.stepManuals) map[m.step_id] = m;
    setManualsMap(map);
  }, [cms.stepManuals]);

  const saveManual = useCallback((manual: ApplicationStepManual) => {
    const updated = { ...manualsMap, [manual.step_id]: manual };
    setManualsMap(updated);
    saveCMS({ stepManuals: Object.values(updated) });
  }, [manualsMap, saveCMS]);

  function startEdit(step: StepLibraryEntry) {
    const existing = manualsMap[step.step_id] ?? {
      step_id: step.step_id,
      tool_ids: [],
      cleaning_method: '',
      technical_notes: '',
      reference_images: [],
    };
    setEditId(step.step_id);
    setDraft({ ...existing });
  }

  function commit() {
    if (!draft.step_id) return;
    const manual: ApplicationStepManual = {
      step_id: draft.step_id,
      tool_ids: draft.tool_ids ?? [],
      cleaning_method: draft.cleaning_method ?? '',
      technical_notes: draft.technical_notes ?? '',
      reference_images: draft.reference_images ?? [],
    };
    saveManual(manual);
    setEditId(null);
    setDraft({});
  }

  const displayed = filter
    ? steps.filter(s =>
        s.step_id.toLowerCase().includes(filter.toLowerCase()) ||
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        (s.product_id ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : steps;

  const tools = cms.tools;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 12, color: '#445164', margin: 0 }}>
        I passi applicativi sono definiti dal motore (step-library.json). Qui puoi aggiungere strumenti, metodi di pulizia e note tecniche manuali.
      </p>

      <input
        type="search"
        placeholder="Cerca step (nome, ID, prodotto)…"
        className="input-field"
        style={{ maxWidth: 320, fontSize: 12 }}
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      <div style={{ fontSize: 11, color: '#8c9aaa' }}>
        {displayed.length} / {steps.length} passi ·{' '}
        {Object.keys(manualsMap).length} arricchiti manualmente
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {displayed.map(step => {
          const manual = manualsMap[step.step_id];
          const hasManual = !!manual && (
            manual.technical_notes || manual.cleaning_method || manual.tool_ids.length > 0
          );
          return editId === step.step_id ? (
            <StepEditBlock
              key={step.step_id}
              step={step}
              draft={draft}
              tools={tools}
              onChange={setDraft}
              onCommit={commit}
              onCancel={() => { setEditId(null); setDraft({}); }}
            />
          ) : (
            <div
              key={step.step_id}
              style={{
                background: '#fff',
                border: hasManual ? '1px solid #b8c4c2' : '1px solid #e2e4e0',
                borderRadius: 6,
                padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#171e29' }}>{step.name}</span>
                  <code style={{ fontSize: 9, background: '#f2f2f0', padding: '1px 5px', borderRadius: 3, color: '#445164' }}>
                    {step.step_id}
                  </code>
                  {step.step_type_id && (
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: '#eef2ef', color: '#3a7060', fontWeight: 600 }}>
                      {STEP_TYPE_LABELS[step.step_type_id] ?? step.step_type_id}
                    </span>
                  )}
                  {step.product_id && (
                    <code style={{ fontSize: 9, color: '#8c9aaa' }}>→ {step.product_id}</code>
                  )}
                </div>
                {hasManual && (
                  <div style={{ marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: '#445164' }}>
                    {manual.tool_ids.length > 0 && (
                      <span>Strumenti: {manual.tool_ids.map(tid => tools.find(t => t.id === tid)?.name ?? tid).join(', ')}</span>
                    )}
                    {manual.cleaning_method && <span>Pulizia: {manual.cleaning_method}</span>}
                    {manual.technical_notes && (
                      <span style={{ color: '#8c9aaa' }}>{manual.technical_notes.slice(0, 60)}{manual.technical_notes.length > 60 ? '…' : ''}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => startEdit(step)}
                style={{ display: 'flex', gap: 4, flexShrink: 0 }}
              >
                <Pencil size={11} /> {hasManual ? 'Modifica' : 'Arricchisci'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepEditBlock({
  step,
  draft,
  tools,
  onChange,
  onCommit,
  onCancel,
}: {
  step: StepLibraryEntry;
  draft: Partial<ApplicationStepManual>;
  tools: { id: string; name: string; icon_media_id: string }[];
  onChange: (d: Partial<ApplicationStepManual>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#171e29' }}>{step.name}</span>
        <code style={{ fontSize: 10, color: '#8c9aaa' }}>{step.step_id}</code>
      </div>

      <div>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
          Strumenti necessari
        </label>
        {tools.length === 0 ? (
          <p style={{ fontSize: 11, color: '#8c9aaa', fontStyle: 'italic' }}>
            Nessuno strumento configurato. Aggiungili nella scheda "Strumenti".
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tools.map(tool => {
              const selected = (draft.tool_ids ?? []).includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    const ids = draft.tool_ids ?? [];
                    onChange({ ...draft, tool_ids: selected ? ids.filter(i => i !== tool.id) : [...ids, tool.id] });
                  }}
                  style={{
                    padding: '4px 12px', fontSize: 11, borderRadius: 4,
                    background: selected ? '#171e29' : '#f2f2f0',
                    color: selected ? '#fff' : '#445164',
                    border: '1px solid ' + (selected ? '#171e29' : '#d4d6d2'),
                    cursor: 'pointer',
                  }}
                >
                  {tool.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
            Pulizia strumenti
          </label>
          <input
            type="text"
            placeholder="es. acqua, solvente"
            value={draft.cleaning_method ?? ''}
            onChange={e => onChange({ ...draft, cleaning_method: e.target.value })}
            className="input-field"
            style={{ fontSize: 12, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
            Note tecniche
          </label>
          <input
            type="text"
            placeholder="Note aggiuntive per l'applicatore"
            value={draft.technical_notes ?? ''}
            onChange={e => onChange({ ...draft, technical_notes: e.target.value })}
            className="input-field"
            style={{ fontSize: 12, width: '100%' }}
          />
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #d4d6d2', paddingTop: 10 }}>
        <p style={{ fontSize: 10, color: '#8c9aaa', margin: '0 0 8px', fontStyle: 'italic' }}>
          Dati per il manuale stratigrafico — lasciali vuoti per usare i valori del motore
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
              Consumo/mq
            </label>
            <input
              type="text"
              placeholder={step.qty != null ? `${step.qty} ${step.unit ?? ''}/mq (auto)` : 'es. 0.20 kg/mq'}
              value={draft.consumption_per_mq ?? ''}
              onChange={e => onChange({ ...draft, consumption_per_mq: e.target.value || undefined })}
              className="input-field"
              style={{ fontSize: 12, width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
              Tempi asciugatura
            </label>
            <input
              type="text"
              placeholder="es. 4/6 h, 12 h, 24 h"
              value={draft.drying_time ?? ''}
              onChange={e => onChange({ ...draft, drying_time: e.target.value || undefined })}
              className="input-field"
              style={{ fontSize: 12, width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
              Rivestimento successivo
            </label>
            <input
              type="text"
              placeholder="es. 6 h, 24 h"
              value={draft.overcoating_time ?? ''}
              onChange={e => onChange({ ...draft, overcoating_time: e.target.value || undefined })}
              className="input-field"
              style={{ fontSize: 12, width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-primary text-xs" onClick={onCommit} style={{ display: 'flex', gap: 4 }}>
          <Check size={12} /> Salva
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}>
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
