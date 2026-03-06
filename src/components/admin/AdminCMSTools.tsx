import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { Tool } from '../../types/cms';

export function AdminCMSTools() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [items, setItems] = useState<Tool[]>(() => cms.tools ?? []);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Tool>>({});

  useEffect(() => { setItems(cms.tools ?? []); }, [cms.tools]);

  function startNew() {
    const id = crypto.randomUUID();
    setEditId(id);
    setDraft({ id, name: '', icon_media_id: '' });
  }

  function startEdit(item: Tool) {
    setEditId(item.id);
    setDraft({ ...item });
  }

  function commit() {
    if (!draft.id || !draft.name?.trim()) return;
    const updated = items.some(i => i.id === draft.id)
      ? items.map(i => i.id === draft.id ? { ...i, ...draft } as Tool : i)
      : [...items, { id: draft.id!, name: draft.name!, icon_media_id: draft.icon_media_id ?? '' }];
    setItems(updated);
    saveCMS({ tools: updated });
    setEditId(null);
    setDraft({});
  }

  function remove(id: string) {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveCMS({ tools: updated });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8c9aaa' }}>{items.length} strumenti configurati</span>
        <button type="button" className="btn-secondary text-xs" onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} /> Aggiungi strumento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {editId && !items.some(i => i.id === editId) && (
          <ToolEditBlock draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
        )}
        {items.map(item =>
          editId === item.id ? (
            <ToolEditBlock key={item.id} draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
          ) : (
            <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#171e29' }}>{item.name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
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

function ToolEditBlock({
  draft,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: Partial<Tool>;
  onChange: (d: Partial<Tool>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="text"
        placeholder="Nome strumento (es. Spatola in acciaio)"
        value={draft.name ?? ''}
        onChange={e => onChange({ ...draft, name: e.target.value })}
        className="input-field"
        style={{ fontSize: 13 }}
      />
      <input
        type="text"
        placeholder="Media ID icona (dalla libreria media)"
        value={draft.icon_media_id ?? ''}
        onChange={e => onChange({ ...draft, icon_media_id: e.target.value })}
        className="input-field"
        style={{ fontSize: 12 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-primary text-xs" onClick={onCommit} style={{ display: 'flex', gap: 4 }}><Check size={12} /> Salva</button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}><X size={12} /></button>
      </div>
    </div>
  );
}
