import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import type { MediaCategory, MediaItemMeta } from '../../types/media';
import {
  uploadMedia,
  listMediaByCategory,
  deleteMedia,
  reorderMedia,
  getMediaBlob,
} from '../../store/media-store';

const CATEGORIES: { id: MediaCategory; label: string }[] = [
  { id: 'environments', label: 'Ambienti' },
  { id: 'supports', label: 'Supporti' },
  { id: 'stratigraphies', label: 'Stratigrafie' },
  { id: 'tools', label: 'Strumenti' },
  { id: 'textures', label: 'Texture' },
];

const ACCEPT_MAP: Record<MediaCategory, string> = {
  environments: 'image/jpeg,image/webp',
  supports: 'image/jpeg,image/webp,image/png',
  stratigraphies: 'image/png,image/webp',
  tools: 'image/svg+xml,image/png',
  textures: 'image/jpeg,image/webp,image/png',
};

interface MediaThumbProps {
  item: MediaItemMeta;
  onDelete: (id: string) => void;
}

function MediaThumb({ item, onDelete }: MediaThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getMediaBlob(item.category, item.id).then(u => {
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.category]);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e4e0',
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '4/3',
          background: '#f5f5f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {url ? (
          <img
            src={url}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImageIcon size={24} color="#b0b8c4" />
        )}
      </div>
      <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#445164', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {item.name}
        </span>
        <span style={{ fontSize: 10, color: '#8c9aaa' }}>
          {(item.size / 1024).toFixed(0)} KB
        </span>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#c94040' }}
          title="Elimina"
        >
          <Trash2 size={13} />
        </button>
        <GripVertical size={13} color="#b0b8c4" style={{ cursor: 'grab' }} />
      </div>
    </div>
  );
}

export function AdminMedia() {
  const [category, setCategory] = useState<MediaCategory>('environments');
  const [items, setItems] = useState<MediaItemMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMediaByCategory(category);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMsg(null);
    try {
      for (const file of Array.from(files)) {
        await uploadMedia(category, file);
      }
      await loadItems();
      setMsg({ type: 'ok', text: `${files.length} immagine/i caricata/e.` });
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Errore upload.' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa immagine?')) return;
    await deleteMedia(category, id);
    await loadItems();
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    await handleFiles(e.dataTransfer.files);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: category === c.id ? 600 : 400,
              background: category === c.id ? '#171e29' : '#f2f2f0',
              color: category === c.id ? '#fff' : '#445164',
              border: '1px solid ' + (category === c.id ? '#171e29' : '#d4d6d2'),
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: '1.5px dashed #b0b8c4',
          borderRadius: 6,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: '#fafafa',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#445164')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#b0b8c4')}
      >
        <Upload size={20} style={{ margin: '0 auto 8px', color: '#8c9aaa' }} />
        <p style={{ fontSize: 12, color: '#445164', margin: 0 }}>
          {uploading ? 'Caricamento in corso…' : 'Trascina qui o clicca per caricare'}
        </p>
        <p style={{ fontSize: 10, color: '#8c9aaa', marginTop: 4 }}>
          {ACCEPT_MAP[category].replace(/image\//g, '').toUpperCase()}
        </p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT_MAP[category]}
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {msg && (
        <p style={{ fontSize: 12, color: msg.type === 'ok' ? '#3a7d44' : '#c94040', margin: 0 }}>
          {msg.text}
        </p>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: '#8c9aaa' }}>Caricamento…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 12, color: '#8c9aaa' }}>Nessuna immagine in questa categoria.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {items.map(item => (
            <MediaThumb key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <p style={{ fontSize: 10, color: '#8c9aaa', borderTop: '1px solid #e8eae6', paddingTop: 8 }}>
        {items.length} immagini · storage: IndexedDB (Blob)
      </p>
    </div>
  );
}
