import React, { useState, useEffect, useCallback } from 'react';
import { useAdminStore } from '../../store/admin-store';
import type { SupportMediaConfig } from '../../types/cms';
import { loadDataStore } from '../../utils/data-loader';
import { listMediaByCategory, getMediaBlob } from '../../store/media-store';
import type { MediaItemMeta } from '../../types/media';
import type { Supporto } from '../../types/supporto';

function SupportMediaSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [items, setItems] = useState<MediaItemMeta[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    listMediaByCategory('supports').then(list => {
      setItems(list);
      list.forEach(async item => {
        const url = await getMediaBlob('supports', item.id);
        if (url) setThumbs(prev => ({ ...prev, [item.id]: url }));
      });
    });
  }, []);

  if (!items.length) {
    return (
      <p style={{ fontSize: 11, color: '#8c9aaa', fontStyle: 'italic' }}>
        Nessuna immagine disponibile. Carica immagini nella scheda "Media" → categoria "Supporti".
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

export function AdminCMSSupports() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [supporti, setSupporti] = useState<Supporto[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localMedia, setLocalMedia] = useState<Record<string, string[]>>({});
  const [filter, setFilter] = useState<'ALL' | 'FLOOR' | 'WALL'>('ALL');

  useEffect(() => {
    const store = loadDataStore();
    setSupporti(store.supporti);
    const map: Record<string, string[]> = {};
    for (const cfg of cms.supportMedia) {
      map[cfg.support_id] = cfg.media_ids;
    }
    setLocalMedia(map);
  }, [cms.supportMedia]);

  const save = useCallback((supportId: string, mediaIds: string[]) => {
    const allIds = supporti.map(s => s.support_id);
    const updated: SupportMediaConfig[] = allIds.map(sid => ({
      support_id: sid,
      media_ids: sid === supportId ? mediaIds : (localMedia[sid] ?? []),
    }));
    saveCMS({ supportMedia: updated });
    setLocalMedia(prev => ({ ...prev, [supportId]: mediaIds }));
  }, [supporti, localMedia, saveCMS]);

  const displayed = filter === 'ALL' ? supporti : supporti.filter(s => s.macro_id === filter);

  const MACRO_LABEL: Record<string, string> = { FLOOR: 'Pavimento', WALL: 'Parete' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12, color: '#445164', margin: 0 }}>
        I supporti sono definiti dal motore (supporti.json). Qui puoi associare immagini e riferimenti tecnici.
      </p>

      <div style={{ display: 'flex', gap: 6 }}>
        {(['ALL', 'FLOOR', 'WALL'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', fontSize: 11, fontWeight: filter === f ? 700 : 400,
              background: filter === f ? '#171e29' : '#f2f2f0',
              color: filter === f ? '#fff' : '#445164',
              border: '1px solid ' + (filter === f ? '#171e29' : '#d4d6d2'),
              borderRadius: 4, cursor: 'pointer',
            }}
          >
            {f === 'ALL' ? 'Tutti' : MACRO_LABEL[f]}
          </button>
        ))}
      </div>

      {displayed.map(sup => {
        const mediaIds = localMedia[sup.support_id] ?? [];
        const isOpen = expandedId === sup.support_id;
        return (
          <div
            key={sup.support_id}
            style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, overflow: 'hidden' }}
          >
            <div
              onClick={() => setExpandedId(isOpen ? null : sup.support_id)}
              style={{
                padding: '10px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                background: isOpen ? '#fafaf8' : '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#171e29' }}>{sup.name}</span>
                <code style={{ fontSize: 10, background: '#f2f2f0', padding: '1px 6px', borderRadius: 3, color: '#445164' }}>
                  {sup.support_id}
                </code>
                <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 3, fontWeight: 600,
                  background: sup.macro_id === 'FLOOR' ? '#f5f0e8' : '#eef1f0',
                  color: sup.macro_id === 'FLOOR' ? '#8a6a30' : '#3a6070',
                }}>
                  {MACRO_LABEL[sup.macro_id] ?? sup.macro_id}
                </span>
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
                  Immagini di riferimento tecnico
                </p>
                <SupportMediaSelector
                  selected={mediaIds}
                  onChange={ids => save(sup.support_id, ids)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
