import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { SupportMediaConfig } from '../../types/cms';
import { loadDataStore } from '../../utils/data-loader';
import { getMediaBlob } from '../../store/media-store';
import type { Supporto } from '../../types/supporto';
import { MediaPickerModal } from './MediaPickerModal';

function AssignedThumbs({ mediaIds }: { mediaIds: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    mediaIds.forEach(async id => {
      const url = await getMediaBlob('supports', id);
      if (url) setUrls(prev => ({ ...prev, [id]: url }));
    });
  }, [mediaIds]);

  if (!mediaIds.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ImageIcon size={13} style={{ color: '#b0b8c4' }} />
        <span style={{ fontSize: 11, color: '#8c9aaa', fontStyle: 'italic' }}>Nessuna immagine assegnata</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {mediaIds.map((id, i) => (
        <div
          key={id}
          style={{
            width: 64, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
            border: i === 0 ? '2px solid #6dbf8a' : '1px solid #d4d6d2',
            background: '#f2f2f0',
          }}
        >
          {urls[id] ? (
            <img src={urls[id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
  const [localMedia, setLocalMedia] = useState<Record<string, string[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
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
    const updated: SupportMediaConfig[] = supporti.map(s => ({
      support_id: s.support_id,
      media_ids: s.support_id === supportId ? mediaIds : (localMedia[s.support_id] ?? []),
    }));
    saveCMS({ supportMedia: updated });
    setLocalMedia(prev => ({ ...prev, [supportId]: mediaIds }));
  }, [supporti, localMedia, saveCMS]);

  const MACRO_LABEL: Record<string, string> = { FLOOR: 'Pavimento', WALL: 'Parete' };
  const displayed = filter === 'ALL' ? supporti : supporti.filter(s => s.macro_id === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12, color: '#445164', margin: '0 0 4px' }}>
        I supporti sono definiti dal motore (supporti.json). Assegna qui immagini di riferimento tecnico.
      </p>

      <div style={{ display: 'flex', gap: 6 }}>
        {(['ALL', 'FLOOR', 'WALL'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', fontSize: 11,
              fontWeight: filter === f ? 700 : 400,
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
                <code style={{ fontSize: 9, background: '#f2f2f0', padding: '1px 5px', borderRadius: 3, color: '#445164' }}>
                  {sup.support_id}
                </code>
                <span style={{
                  fontSize: 10, padding: '1px 8px', borderRadius: 3, fontWeight: 600,
                  background: sup.macro_id === 'FLOOR' ? '#f5f0e8' : '#eef1f0',
                  color: sup.macro_id === 'FLOOR' ? '#8a6a30' : '#3a6070',
                }}>
                  {MACRO_LABEL[sup.macro_id] ?? sup.macro_id}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {mediaIds.length > 0 && (
                  <span style={{ fontSize: 10, color: '#6dbf8a', fontWeight: 700 }}>{mediaIds.length} img</span>
                )}
                <span style={{ fontSize: 11, color: '#8c9aaa' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid #f0f0ee', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AssignedThumbs mediaIds={mediaIds} />
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setPickerFor(sup.support_id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                >
                  <Plus size={12} />
                  {mediaIds.length === 0 ? 'Assegna immagini' : 'Modifica selezione'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {pickerFor && (
        <MediaPickerModal
          category="supports"
          selected={localMedia[pickerFor] ?? []}
          title={`Immagini — ${supporti.find(s => s.support_id === pickerFor)?.name ?? pickerFor}`}
          onConfirm={ids => { save(pickerFor, ids); setPickerFor(null); }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}
