import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { ApplicationStep } from '../../types/cms';

export function AdminApplicationSteps() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [items, setItems] = useState<ApplicationStep[]>(() =>
    [...(cms.applicationSteps ?? [])].sort((a, b) => a.order - b.order)
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ApplicationStep>>({});
  const [filterProduct, setFilterProduct] = useState('');

  useEffect(() => {
    setItems([...(cms.applicationSteps ?? [])].sort((a, b) => a.order - b.order));
  }, [cms.applicationSteps]);

  const displayed = filterProduct
    ? items.filter(i => i.product_id.toLowerCase().includes(filterProduct.toLowerCase()))
    : items;

  function startNew() {
    const id = crypto.randomUUID();
    const maxOrder = items.reduce((m, i) => Math.max(m, i.order), -1);
    setEditId(id);
    setDraft({ id, product_id: '', order: maxOrder + 1, step_name: '', consumption: '', drying_time: '', overcoating_time: '', tool_ids: [], cleaning_method: '', technical_notes: '' });
  }

  function startEdit(item: ApplicationStep) {
    setEditId(item.id);
    setDraft({ ...item });
  }

  function commit() {
    if (!draft.id || !draft.product_id?.trim() || !draft.step_name?.trim()) return;
    const full: ApplicationStep = {
      id: draft.id,
      product_id: draft.product_id!,
      order: draft.order ?? 0,
      step_name: draft.step_name!,
      consumption: draft.consumption ?? '',
      drying_time: draft.drying_time ?? '',
      overcoating_time: draft.overcoating_time ?? '',
      tool_ids: draft.tool_ids ?? [],
      cleaning_method: draft.cleaning_method ?? '',
      technical_notes: draft.technical_notes ?? '',
    };
    const updated = items.some(i => i.id === full.id)
      ? items.map(i => i.id === full.id ? full : i)
      : [...items, full];
    const sorted = updated.sort((a, b) => a.order - b.order);
    setItems(sorted);
    saveCMS({ applicationSteps: sorted });
    setEditId(null);
    setDraft({});
  }

  function remove(id: string) {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveCMS({ applicationSteps: updated });
  }

  function moveOrder(id: string, dir: 'up' | 'down') {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= items.length) return;
    const updated = [...items];
    const temp = updated[idx].order;
    updated[idx] = { ...updated[idx], order: updated[swap].order };
    updated[swap] = { ...updated[swap], order: temp };
    const sorted = updated.sort((a, b) => a.order - b.order);
    setItems(sorted);
    saveCMS({ applicationSteps: sorted });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <input
          type="search"
          placeholder="Filtra per product_id…"
          className="input-field"
          style={{ maxWidth: 200, fontSize: 12 }}
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#8c9aaa' }}>{items.length} step</span>
          <button type="button" className="btn-secondary text-xs" onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} /> Aggiungi step
          </button>
        </div>
      </div>

      {editId && !items.some(i => i.id === editId) && (
        <StepEditBlock draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {displayed.map((item, idx) =>
          editId === item.id ? (
            <StepEditBlock key={item.id} draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
          ) : (
            <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" onClick={() => moveOrder(item.id, 'up')} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c9aaa', padding: 0 }}><ChevronUp size={12} /></button>
                <button type="button" onClick={() => moveOrder(item.id, 'down')} disabled={idx === displayed.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c9aaa', padding: 0 }}><ChevronDown size={12} /></button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#171e29' }}>{item.step_name}</span>
                  <code style={{ fontSize: 10, background: '#f2f2f0', padding: '1px 5px', borderRadius: 3, color: '#445164' }}>{item.product_id}</code>
                </div>
                <div style={{ fontSize: 11, color: '#8c9aaa', marginTop: 3, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {item.consumption && <span>Consumo: {item.consumption}</span>}
                  {item.drying_time && <span>Asciugatura: {item.drying_time}</span>}
                  {item.overcoating_time && <span>Rivestimento: {item.overcoating_time}</span>}
                </div>
                {item.technical_notes && <p style={{ fontSize: 11, color: '#445164', marginTop: 4 }}>{item.technical_notes}</p>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(item)} style={{ display: 'flex', gap: 4 }}><Pencil size={11} /></button>
                <button type="button" onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c94040' }}><Trash2 size={13} /></button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

type StepField = keyof ApplicationStep;

function StepEditBlock({
  draft,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: Partial<ApplicationStep>;
  onChange: (d: Partial<ApplicationStep>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  function field(key: StepField, label: string, placeholder = '') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
        <input
          type="text"
          placeholder={placeholder}
          value={(draft[key] as string) ?? ''}
          onChange={e => onChange({ ...draft, [key]: e.target.value })}
          className="input-field"
          style={{ fontSize: 12 }}
        />
      </div>
    );
  }

  return (
    <div style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {field('product_id', 'Product ID', 'es. PR_SW')}
        {field('step_name', 'Nome step', 'es. Applicazione Primer')}
        {field('consumption', 'Consumo', 'es. 0.2 kg/m²')}
        {field('drying_time', 'Tempo asciugatura', 'es. 4h a 20°C')}
        {field('overcoating_time', 'Tempo rivestimento', 'es. 24h')}
        {field('cleaning_method', 'Pulizia strumenti', 'es. acqua')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Note tecniche</label>
        <textarea
          placeholder="Note aggiuntive per l'applicatore"
          value={draft.technical_notes ?? ''}
          onChange={e => onChange({ ...draft, technical_notes: e.target.value })}
          className="input-field"
          rows={2}
          style={{ fontSize: 12, resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-primary text-xs" onClick={onCommit} style={{ display: 'flex', gap: 4 }}><Check size={12} /> Salva</button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}><X size={12} /></button>
      </div>
    </div>
  );
}
