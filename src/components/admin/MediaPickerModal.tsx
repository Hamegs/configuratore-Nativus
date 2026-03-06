import React, { useState, useEffect } from 'react';
import { X, Check, Image as ImageIcon } from 'lucide-react';
import type { MediaCategory, MediaItemMeta } from '../../types/media';
import { listMediaByCategory, getMediaBlob } from '../../store/media-store';

interface Props {
  category: MediaCategory;
  selected: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
  title?: string;
  maxSelect?: number;
}

export function MediaPickerModal({ category, selected, onConfirm, onClose, title, maxSelect }: Props) {
  const [items, setItems] = useState<MediaItemMeta[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [localSel, setLocalSel] = useState<string[]>([...selected]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setThumbs({});
    listMediaByCategory(category).then(list => {
      setItems(list);
      setLoading(false);
      list.forEach(async item => {
        const url = await getMediaBlob(category, item.id);
        if (url) setThumbs(prev => ({ ...prev, [item.id]: url }));
      });
    });
  }, [category]);

  function toggle(id: string) {
    if (maxSelect === 1) {
      setLocalSel(prev => (prev[0] === id ? [] : [id]));
    } else {
      setLocalSel(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 8,
          width: '100%', maxWidth: 720, maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.30)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e2e4e0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#171e29', margin: 0 }}>
            {title ?? 'Seleziona immagini'}
          </h3>
          <button
            type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#8c9aaa', display: 'flex', borderRadius: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {loading ? (
            <p style={{ fontSize: 12, color: '#8c9aaa', textAlign: 'center', padding: '48px 0', margin: 0 }}>Caricamento…</p>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <ImageIcon size={32} style={{ margin: '0 auto 10px', color: '#b0b8c4', display: 'block' }} />
              <p style={{ fontSize: 13, color: '#445164', margin: '0 0 4px', fontWeight: 500 }}>Nessuna immagine disponibile</p>
              <p style={{ fontSize: 11, color: '#8c9aaa', margin: 0 }}>
                Carica immagini nella scheda "Media" → categoria corrispondente.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: 10 }}>
              {items.map(item => {
                const isSel = localSel.includes(item.id);
                const isFirst = localSel[0] === item.id && maxSelect !== 1 && localSel.length > 1;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    style={{
                      position: 'relative', cursor: 'pointer', borderRadius: 5, overflow: 'hidden',
                      border: `2px solid ${isSel ? '#171e29' : '#e2e4e0'}`,
                      boxShadow: isSel ? '0 0 0 2px rgba(23,30,41,0.10)' : 'none',
                      transition: 'border-color 0.12s, box-shadow 0.12s',
                    }}
                    title={item.name}
                  >
                    <div style={{ width: '100%', aspectRatio: '4/3', background: '#f2f2f0', overflow: 'hidden' }}>
                      {thumbs[item.id] ? (
                        <img src={thumbs[item.id]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} color="#b0b8c4" />
                        </div>
                      )}
                    </div>

                    {isSel && (
                      <div style={{
                        position: 'absolute', top: 5, right: 5,
                        background: '#171e29', borderRadius: '50%',
                        width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={11} color="#fff" />
                      </div>
                    )}
                    {isFirst && (
                      <div style={{
                        position: 'absolute', top: 5, left: 5,
                        background: '#6dbf8a', borderRadius: 3,
                        padding: '1px 5px', fontSize: 8, fontWeight: 800,
                        color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>
                        cover
                      </div>
                    )}
                    <p style={{
                      fontSize: 9, color: '#445164',
                      padding: '3px 6px', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      background: '#fafaf8', borderTop: '1px solid #f0f0ee',
                    }}>
                      {item.name}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e2e4e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12, background: '#fafaf8', borderRadius: '0 0 8px 8px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#8c9aaa' }}>
            {localSel.length === 0
              ? 'Nessuna selezione'
              : maxSelect === 1
                ? '1 immagine selezionata'
                : `${localSel.length} selezionate · la prima è la cover`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary text-xs" onClick={onClose}>Annulla</button>
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => onConfirm(localSel)}
              style={{ padding: '6px 16px' }}
            >
              Conferma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
