import React, { useState, useEffect, useCallback } from 'react';
import { useAdminStore } from '../../store/admin-store';
import type { EnvironmentMediaConfig } from '../../types/cms';
import { loadDataStore } from '../../utils/data-loader';
import { listMediaByCategory, getMediaBlob } from '../../store/media-store';
import type { MediaItemMeta } from '../../types/media';
import type { Ambiente } from '../../types/enums';

function MediaSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [items, setItems] = useState<MediaItemMeta[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    listMediaByCategory('environments').then(list => {
      setItems(list);
      list.forEach(async item => {
        const url = await getMediaBlob('environments', item.id);
        if (url) setThumbs(prev => ({ ...prev, [item.id]: url }));
      });
    });
  }, []);

  if (!items.length) {
    return (
      <p style={{ fontSize: 11, color: '#8c9aaa', fontStyle: 'italic' }}>
        Nessuna immagine disponibile. Carica immagini nella scheda "Media" → categoria "Ambienti".
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

export function AdminCMSEnvironments() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [ambienti, setAmbienti] = useState<Ambiente[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localMedia, setLocalMedia] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const store = loadDataStore();
    setAmbienti(store.ambienti);
    const map: Record<string, string[]> = {};
    for (const cfg of cms.environmentMedia) {
      map[cfg.environment_id] = cfg.media_ids;
    }
    setLocalMedia(map);
  }, [cms.environmentMedia]);

  const save = useCallback((envId: string, mediaIds: string[]) => {
    const updated = ambienti.map(a => ({
      environment_id: a.env_id,
      media_ids: a.env_id === envId ? mediaIds : (localMedia[a.env_id] ?? []),
    } as EnvironmentMediaConfig));
    saveCMS({ environmentMedia: updated });
    setLocalMedia(prev => ({ ...prev, [envId]: mediaIds }));
  }, [ambienti, localMedia, saveCMS]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12, color: '#445164', margin: 0 }}>
        Gli ambienti sono definiti dal motore (ambienti.json). Qui puoi associare immagini a ciascun ambiente.
      </p>

      {ambienti.map(env => {
        const mediaIds = localMedia[env.env_id] ?? [];
        const isOpen = expandedId === env.env_id;
        return (
          <div
            key={env.env_id}
            style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, overflow: 'hidden' }}
          >
            <div
              onClick={() => setExpandedId(isOpen ? null : env.env_id)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                background: isOpen ? '#fafaf8' : '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#171e29' }}>{env.name}</span>
                <code style={{ fontSize: 10, background: '#f2f2f0', padding: '1px 6px', borderRadius: 3, color: '#445164' }}>
                  {env.env_id}
                </code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {mediaIds.length > 0 && (
                  <span style={{ fontSize: 11, color: '#6dbf8a', fontWeight: 600 }}>
                    {mediaIds.length} immagini
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#8c9aaa' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid #f0f0ee' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#445164', marginBottom: 10 }}>
                  Immagini associate (usate nelle card ambiente)
                </p>
                <MediaSelector
                  selected={mediaIds}
                  onChange={ids => save(env.env_id, ids)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
