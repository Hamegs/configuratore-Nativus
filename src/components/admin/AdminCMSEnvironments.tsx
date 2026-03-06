import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { EnvironmentConfig } from '../../types/cms';
import { listMediaByCategory, getMediaBlob } from '../../store/media-store';
import type { MediaItemMeta } from '../../types/media';

function useMediaList(category: 'environments') {
  const [items, setItems] = useState<MediaItemMeta[]>([]);
  useEffect(() => {
    listMediaByCategory(category).then(setItems);
  }, [category]);
  return items;
}

function MediaSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const mediaItems = useMediaList('environments');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const entries: [string, string][] = [];
      for (const item of mediaItems) {
        const url = await getMediaBlob('environments', item.id);
        if (url) entries.push([item.id, url]);
      }
      setThumbs(Object.fromEntries(entries));
    };
    if (mediaItems.length) void load();
  }, [mediaItems]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  }

  if (!mediaItems.length) {
    return <p style={{ fontSize: 11, color: '#8c9aaa' }}>Nessuna immagine. Carica in Media Library.</p>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {mediaItems.map(item => (
        <div
          key={item.id}
          onClick={() => toggle(item.id)}
          style={{
            width: 72, height: 54, borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
            border: selected.includes(item.id) ? '2px solid #171e29' : '2px solid transparent',
            opacity: selected.includes(item.id) ? 1 : 0.55,
            background: '#f2f2f0',
          }}
        >
          {thumbs[item.id] && (
            <img src={thumbs[item.id]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      ))}
    </div>
  );
}

export function AdminCMSEnvironments() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [items, setItems] = useState<EnvironmentConfig[]>(() => cms.environmentConfigs ?? []);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EnvironmentConfig>>({});

  useEffect(() => { setItems(cms.environmentConfigs ?? []); }, [cms.environmentConfigs]);

  function save() {
    saveCMS({ environmentConfigs: items });
  }

  function startNew() {
    const id = crypto.randomUUID();
    setEditId(id);
    setDraft({ id, name: '', media_ids: [] });
  }

  function startEdit(item: EnvironmentConfig) {
    setEditId(item.id);
    setDraft({ ...item });
  }

  function commitEdit() {
    if (!draft.id || !draft.name?.trim()) return;
    const updated = items.some(i => i.id === draft.id)
      ? items.map(i => i.id === draft.id ? { ...i, ...draft } as EnvironmentConfig : i)
      : [...items, { id: draft.id, name: draft.name!, media_ids: draft.media_ids ?? [] }];
    setItems(updated);
    saveCMS({ environmentConfigs: updated });
    setEditId(null);
    setDraft({});
  }

  function remove(id: string) {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveCMS({ environmentConfigs: updated });
  }

  void save;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8c9aaa' }}>{items.length} ambienti configurati</span>
        <button type="button" className="btn-secondary text-xs" onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} /> Aggiungi ambiente
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {editId && !items.some(i => i.id === editId) && (
          <EditBlock draft={draft} onDraftChange={setDraft} onCommit={commitEdit} onCancel={() => { setEditId(null); setDraft({}); }} />
        )}
        {items.map(item => (
          editId === item.id ? (
            <EditBlock key={item.id} draft={draft} onDraftChange={setDraft} onCommit={commitEdit} onCancel={() => { setEditId(null); setDraft({}); }} />
          ) : (
            <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#171e29' }}>{item.name}</span>
                <span style={{ fontSize: 11, color: '#8c9aaa', marginLeft: 10 }}>{item.media_ids.length} immagini</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(item)} style={{ display: 'flex', gap: 4 }}><Pencil size={11} /> Modifica</button>
                <button type="button" onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c94040' }}><Trash2 size={14} /></button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function EditBlock({
  draft,
  onDraftChange,
  onCommit,
  onCancel,
}: {
  draft: Partial<EnvironmentConfig>;
  onDraftChange: (d: Partial<EnvironmentConfig>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Nome ambiente"
          value={draft.name ?? ''}
          onChange={e => onDraftChange({ ...draft, name: e.target.value })}
          className="input-field"
          style={{ flex: 1, fontSize: 13 }}
        />
        <button type="button" className="btn-primary text-xs" onClick={onCommit} style={{ display: 'flex', gap: 4 }}><Check size={12} /> Salva</button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}><X size={12} /></button>
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#445164', marginBottom: 8 }}>Immagini associate</p>
        <MediaSelector selected={draft.media_ids ?? []} onChange={ids => onDraftChange({ ...draft, media_ids: ids })} />
      </div>
    </div>
  );
}
