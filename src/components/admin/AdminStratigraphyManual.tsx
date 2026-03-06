import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { StratigraphyMediaConfig } from '../../types/cms';
import { loadDataStore } from '../../utils/data-loader';
import { listMediaByCategory, getMediaBlob } from '../../store/media-store';
import type { MediaItemMeta } from '../../types/media';

function StratigraphyImageSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [items, setItems] = useState<MediaItemMeta[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    listMediaByCategory('stratigraphies').then(list => {
      setItems(list);
      list.forEach(async item => {
        const url = await getMediaBlob('stratigraphies', item.id);
        if (url) setThumbs(prev => ({ ...prev, [item.id]: url }));
      });
    });
  }, []);

  if (!items.length) {
    return (
      <p style={{ fontSize: 11, color: '#8c9aaa', fontStyle: 'italic' }}>
        Nessuna immagine disponibile. Carica in "Media" → "Stratigrafie".
      </p>
    );
  }

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => toggle(item.id)}
          title={item.name}
          style={{
            width: 80, height: 60, borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
            border: selected.includes(item.id) ? '2px solid #171e29' : '2px solid #e2e4e0',
            opacity: selected.includes(item.id) ? 1 : 0.6,
            background: '#f2f2f0', flexShrink: 0,
            transition: 'opacity 0.15s, border-color 0.15s',
          }}
        >
          {thumbs[item.id] ? (
            <img src={thumbs[item.id]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#eaeae8' }} />
          )}
        </div>
      ))}
    </div>
  );
}

export function AdminStratigraphyManual() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [configs, setConfigs] = useState<StratigraphyMediaConfig[]>(() => cms.stratigraphyMedia ?? []);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<StratigraphyMediaConfig>>({});

  useEffect(() => {
    setConfigs(cms.stratigraphyMedia ?? []);
  }, [cms.stratigraphyMedia]);

  const [supportiOptions, setSupportiOptions] = useState<{ id: string; name: string }[]>([]);
  const [textureOptions, setTextureOptions] = useState<{ id: string; name: string }[]>([]);
  const [ambienteOptions, setAmbienteOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const store = loadDataStore();
    setSupportiOptions(store.supporti.map(s => ({ id: s.support_id, name: s.name })));
    setTextureOptions(store.textureLines.map(l => ({ id: l.line_id, name: l.name })));
    setAmbienteOptions([
      { id: '', name: '(Qualsiasi)' },
      ...store.ambienti.map(a => ({ id: a.env_id, name: a.name })),
    ]);
  }, []);

  const save = useCallback((updated: StratigraphyMediaConfig[]) => {
    setConfigs(updated);
    saveCMS({ stratigraphyMedia: updated });
  }, [saveCMS]);

  function startNew() {
    const id = crypto.randomUUID();
    setEditId(id);
    setDraft({ id, support_id: '', system_name: '', environment_type: '', media_ids: [] });
  }

  function startEdit(cfg: StratigraphyMediaConfig) {
    setEditId(cfg.id);
    setDraft({ ...cfg });
  }

  function commit() {
    if (!draft.id) return;
    const full: StratigraphyMediaConfig = {
      id: draft.id,
      support_id: draft.support_id ?? '',
      system_name: draft.system_name ?? '',
      environment_type: draft.environment_type ?? '',
      media_ids: draft.media_ids ?? [],
    };
    const updated = configs.some(c => c.id === full.id)
      ? configs.map(c => c.id === full.id ? full : c)
      : [...configs, full];
    save(updated);
    setEditId(null);
    setDraft({});
  }

  function remove(id: string) {
    save(configs.filter(c => c.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 12, color: '#445164', margin: 0 }}>
        La stratigrafia è calcolata dal motore (decision-table + step-library). Qui puoi associare
        immagini tecniche e diagrammi a ciascuna combinazione supporto × sistema × ambiente.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8c9aaa' }}>{configs.length} configurazioni media</span>
        <button type="button" className="btn-secondary text-xs" onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} /> Aggiungi configurazione
        </button>
      </div>

      {editId && !configs.some(c => c.id === editId) && (
        <EditBlock
          draft={draft}
          supportiOptions={supportiOptions}
          textureOptions={textureOptions}
          ambienteOptions={ambienteOptions}
          onChange={setDraft}
          onCommit={commit}
          onCancel={() => { setEditId(null); setDraft({}); }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {configs.map(cfg =>
          editId === cfg.id ? (
            <EditBlock
              key={cfg.id}
              draft={draft}
              supportiOptions={supportiOptions}
              textureOptions={textureOptions}
              ambienteOptions={ambienteOptions}
              onChange={setDraft}
              onCommit={commit}
              onCancel={() => { setEditId(null); setDraft({}); }}
            />
          ) : (
            <div key={cfg.id} style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#171e29' }}>
                    {supportiOptions.find(s => s.id === cfg.support_id)?.name ?? cfg.support_id}
                  </span>
                  {cfg.system_name && (
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 3, background: '#eef2ef', color: '#3a7060', fontWeight: 600 }}>
                      {textureOptions.find(t => t.id === cfg.system_name)?.name ?? cfg.system_name}
                    </span>
                  )}
                  {cfg.environment_type && (
                    <span style={{ fontSize: 10, color: '#8c9aaa' }}>
                      {ambienteOptions.find(a => a.id === cfg.environment_type)?.name ?? cfg.environment_type}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: cfg.media_ids.length > 0 ? '#6dbf8a' : '#8c9aaa' }}>
                  {cfg.media_ids.length > 0 ? `${cfg.media_ids.length} immagini associate` : 'Nessuna immagine'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(cfg)} style={{ display: 'flex', gap: 4 }}><Pencil size={11} /></button>
                <button type="button" onClick={() => remove(cfg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c94040' }}><Trash2 size={13} /></button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EditBlock({
  draft,
  supportiOptions,
  textureOptions,
  ambienteOptions,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: Partial<StratigraphyMediaConfig>;
  supportiOptions: { id: string; name: string }[];
  textureOptions: { id: string; name: string }[];
  ambienteOptions: { id: string; name: string }[];
  onChange: (d: Partial<StratigraphyMediaConfig>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Supporto</label>
          <select
            className="input-field"
            value={draft.support_id ?? ''}
            onChange={e => onChange({ ...draft, support_id: e.target.value })}
            style={{ fontSize: 12, width: '100%' }}
          >
            <option value="">— seleziona —</option>
            {supportiOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Sistema texture</label>
          <select
            className="input-field"
            value={draft.system_name ?? ''}
            onChange={e => onChange({ ...draft, system_name: e.target.value })}
            style={{ fontSize: 12, width: '100%' }}
          >
            <option value="">— qualsiasi —</option>
            {textureOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Ambiente</label>
          <select
            className="input-field"
            value={draft.environment_type ?? ''}
            onChange={e => onChange({ ...draft, environment_type: e.target.value })}
            style={{ fontSize: 12, width: '100%' }}
          >
            {ambienteOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
          Immagini stratigrafiche
        </label>
        <StratigraphyImageSelector
          selected={draft.media_ids ?? []}
          onChange={ids => onChange({ ...draft, media_ids: ids })}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-primary text-xs" onClick={onCommit} style={{ display: 'flex', gap: 4 }}><Check size={12} /> Salva</button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}><X size={12} /></button>
      </div>
    </div>
  );
}
