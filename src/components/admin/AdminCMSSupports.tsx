import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { SupportConfig } from '../../types/cms';

export function AdminCMSSupports() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [items, setItems] = useState<SupportConfig[]>(() => cms.supportConfigs ?? []);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<SupportConfig>>({});

  useEffect(() => { setItems(cms.supportConfigs ?? []); }, [cms.supportConfigs]);

  function startNew() {
    const id = crypto.randomUUID();
    setEditId(id);
    setDraft({ id, name: '', description: '', media_ids: [] });
  }

  function startEdit(item: SupportConfig) {
    setEditId(item.id);
    setDraft({ ...item });
  }

  function commit() {
    if (!draft.id || !draft.name?.trim()) return;
    const updated = items.some(i => i.id === draft.id)
      ? items.map(i => i.id === draft.id ? { ...i, ...draft } as SupportConfig : i)
      : [...items, { id: draft.id!, name: draft.name!, description: draft.description ?? '', media_ids: draft.media_ids ?? [] }];
    setItems(updated);
    saveCMS({ supportConfigs: updated });
    setEditId(null);
    setDraft({});
  }

  function remove(id: string) {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveCMS({ supportConfigs: updated });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8c9aaa' }}>{items.length} supporti configurati</span>
        <button type="button" className="btn-secondary text-xs" onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} /> Aggiungi supporto
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {editId && !items.some(i => i.id === editId) && (
          <SupportEditBlock draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
        )}
        {items.map(item =>
          editId === item.id ? (
            <SupportEditBlock key={item.id} draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
          ) : (
            <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#171e29' }}>{item.name}</span>
                {item.description && <p style={{ fontSize: 11, color: '#445164', marginTop: 2 }}>{item.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(item)} style={{ display: 'flex', gap: 4 }}><Pencil size={11} /> Modifica</button>
                <button type="button" onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c94040' }}><Trash2 size={14} /></button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SupportEditBlock({
  draft,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: Partial<SupportConfig>;
  onChange: (d: Partial<SupportConfig>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="text"
        placeholder="Nome supporto"
        value={draft.name ?? ''}
        onChange={e => onChange({ ...draft, name: e.target.value })}
        className="input-field"
        style={{ fontSize: 13 }}
      />
      <textarea
        placeholder="Descrizione"
        value={draft.description ?? ''}
        onChange={e => onChange({ ...draft, description: e.target.value })}
        className="input-field"
        rows={2}
        style={{ fontSize: 12, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-primary text-xs" onClick={onCommit} style={{ display: 'flex', gap: 4 }}><Check size={12} /> Salva</button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}><X size={12} /></button>
      </div>
    </div>
  );
}
