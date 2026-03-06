import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { OperationalSheetTemplate, OperationalAudience, OperationalField } from '../../types/cms';

const AUDIENCES: { id: OperationalAudience; label: string }[] = [
  { id: 'APPLICATORE', label: 'Applicatore' },
  { id: 'DISTRIBUTORE', label: 'Distributore' },
  { id: 'PROGETTISTA', label: 'Progettista' },
];

const ALL_FIELDS: { id: OperationalField; label: string }[] = [
  { id: 'material', label: 'Materiale' },
  { id: 'consumption', label: 'Consumo' },
  { id: 'application_times', label: 'Tempi applicazione' },
  { id: 'tools', label: 'Strumenti' },
  { id: 'cleaning', label: 'Pulizia' },
  { id: 'technical_notes', label: 'Note tecniche' },
  { id: 'pricing', label: 'Prezzi' },
];

const DEFAULT_TEMPLATES: OperationalSheetTemplate[] = [
  {
    id: 'tpl_applicatore',
    audience: 'APPLICATORE',
    visible_fields: ['material', 'consumption', 'application_times', 'tools', 'cleaning', 'technical_notes'],
  },
  {
    id: 'tpl_distributore',
    audience: 'DISTRIBUTORE',
    visible_fields: ['material', 'consumption', 'pricing'],
  },
  {
    id: 'tpl_progettista',
    audience: 'PROGETTISTA',
    visible_fields: ['material', 'consumption', 'technical_notes'],
  },
];

export function AdminOperationalSheets() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [templates, setTemplates] = useState<OperationalSheetTemplate[]>(() => {
    if (cms.operationalSheetTemplates?.length) return cms.operationalSheetTemplates;
    return DEFAULT_TEMPLATES;
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<OperationalSheetTemplate>>({});

  useEffect(() => {
    if (cms.operationalSheetTemplates?.length) {
      setTemplates(cms.operationalSheetTemplates);
    }
  }, [cms.operationalSheetTemplates]);

  function startEdit(t: OperationalSheetTemplate) {
    setEditId(t.id);
    setDraft({ ...t, visible_fields: [...t.visible_fields] });
  }

  function commit() {
    if (!draft.id || !draft.audience) return;
    const updated = templates.map(t => t.id === draft.id ? { ...t, ...draft } as OperationalSheetTemplate : t);
    setTemplates(updated);
    saveCMS({ operationalSheetTemplates: updated });
    setEditId(null);
    setDraft({});
  }

  function toggleField(field: OperationalField) {
    const current = draft.visible_fields ?? [];
    const updated = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
    setDraft({ ...draft, visible_fields: updated });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: '#445164' }}>
        Configura i campi visibili nelle schede operative per ogni tipo di utente.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {templates.map(t =>
          editId === t.id ? (
            <div key={t.id} style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 8, padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#171e29', marginBottom: 12 }}>
                {AUDIENCES.find(a => a.id === t.audience)?.label ?? t.audience}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
                {ALL_FIELDS.map(f => (
                  <label key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={(draft.visible_fields ?? []).includes(f.id)}
                      onChange={() => toggleField(f.id)}
                      style={{ width: 14, height: 14 }}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-primary text-xs" onClick={commit} style={{ display: 'flex', gap: 4 }}><Check size={12} /> Salva</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => { setEditId(null); setDraft({}); }}><X size={12} /></button>
              </div>
            </div>
          ) : (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#171e29', margin: 0 }}>
                  {AUDIENCES.find(a => a.id === t.audience)?.label ?? t.audience}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {t.visible_fields.map(f => (
                    <span key={f} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: '#f2f2f0', color: '#445164' }}>
                      {ALL_FIELDS.find(af => af.id === f)?.label ?? f}
                    </span>
                  ))}
                </div>
              </div>
              <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(t)} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Pencil size={11} /> Modifica
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
