import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { TextureMediaConfig } from '../../types/cms';
import { loadDataStore } from '../../utils/data-loader';
import { getMediaBlob } from '../../store/media-store';
import { MediaPickerModal } from './MediaPickerModal';

interface TextureLineEntry {
  line_id: string;
  name: string;
  [key: string]: unknown;
}

function AssignedThumbs({ mediaIds }: { mediaIds: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    mediaIds.forEach(async id => {
      const url = await getMediaBlob('textures', id);
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
            width: 64, height: 64, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
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

export function AdminCMSTextures() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [lines, setLines] = useState<TextureLineEntry[]>([]);
  const [localMedia, setLocalMedia] = useState<Record<string, string[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  useEffect(() => {
    const store = loadDataStore();
    setLines((store.textureLines ?? []) as unknown as TextureLineEntry[]);
    const map: Record<string, string[]> = {};
    for (const cfg of (cms.textureMedia ?? [])) {
      map[cfg.texture_id] = cfg.media_ids;
    }
    setLocalMedia(map);
  }, [cms.textureMedia]);

  const save = useCallback((textureId: string, mediaIds: string[]) => {
    const allIds = lines.map(l => l.line_id);
    const updated: TextureMediaConfig[] = allIds.map(tid => ({
      texture_id: tid,
      media_ids: tid === textureId ? mediaIds : (localMedia[tid] ?? []),
    }));
    saveCMS({ textureMedia: updated });
    setLocalMedia(prev => ({ ...prev, [textureId]: mediaIds }));
  }, [lines, localMedia, saveCMS]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 12, color: '#445164', margin: '0 0 4px' }}>
        Assegna immagini di preview ai sistemi texture.
        Le immagini vengono usate nelle schede materiale e nella stratigrafia.
      </p>

      {lines.length === 0 && (
        <p style={{ fontSize: 12, color: '#8c9aaa', fontStyle: 'italic' }}>
          Nessun sistema texture trovato nel motore.
        </p>
      )}

      {lines.map(line => {
        const mediaIds = localMedia[line.line_id] ?? [];
        const isOpen = expandedId === line.line_id;
        return (
          <div
            key={line.line_id}
            style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 6, overflow: 'hidden' }}
          >
            <div
              onClick={() => setExpandedId(isOpen ? null : line.line_id)}
              style={{
                padding: '10px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                background: isOpen ? '#fafaf8' : '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#171e29' }}>{line.name}</span>
                <code style={{ fontSize: 9, background: '#f2f2f0', padding: '1px 5px', borderRadius: 3, color: '#445164' }}>
                  {line.line_id}
                </code>
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
                  onClick={() => setPickerFor(line.line_id)}
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
          category="textures"
          selected={localMedia[pickerFor] ?? []}
          title={`Immagini — ${lines.find(l => l.line_id === pickerFor)?.name ?? pickerFor}`}
          onConfirm={ids => { save(pickerFor, ids); setPickerFor(null); }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}
