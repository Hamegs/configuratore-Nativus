import type { MediaItem, MediaCategory, MediaItemMeta } from '../types/media';

const DB_NAME = 'nativus_media';
const DB_VERSION = 1;
const STORE_NAMES: MediaCategory[] = ['environments', 'supports', 'stratigraphies', 'tools', 'textures'];

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function uploadMedia(
  category: MediaCategory,
  file: File,
  entityId?: string
): Promise<MediaItemMeta> {
  const db = await openDB();
  const existing = await listMediaByCategory(category, entityId);
  const maxOrder = existing.reduce((m, i) => Math.max(m, i.order), -1);

  const item: MediaItem = {
    id: crypto.randomUUID(),
    category,
    name: file.name,
    data: file,
    mimeType: file.type,
    size: file.size,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
    entityId,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(category, 'readwrite');
    const store = tx.objectStore(category);
    const req = store.put(item);
    req.onsuccess = () => {
      const { data: _data, ...meta } = item;
      void _data;
      resolve(meta as MediaItemMeta);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listMediaByCategory(
  category: MediaCategory,
  entityId?: string
): Promise<MediaItemMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(category, 'readonly');
    const store = tx.objectStore(category);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result as MediaItem[];
      const filtered = entityId
        ? all.filter(i => i.entityId === entityId)
        : all;
      const metas: MediaItemMeta[] = filtered
        .sort((a, b) => a.order - b.order)
        .map(({ data: _data, ...meta }) => {
          void _data;
          return meta as MediaItemMeta;
        });
      resolve(metas);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getMediaBlob(
  category: MediaCategory,
  id: string
): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(category, 'readonly');
    const store = tx.objectStore(category);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result as MediaItem | undefined;
      if (!item) { resolve(null); return; }
      const url = URL.createObjectURL(item.data);
      resolve(url);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMedia(
  category: MediaCategory,
  id: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(category, 'readwrite');
    const store = tx.objectStore(category);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function reorderMedia(
  category: MediaCategory,
  orderedIds: string[]
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(category, 'readwrite');
  const store = tx.objectStore(category);

  const getAll = (): Promise<MediaItem[]> =>
    new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result as MediaItem[]);
      r.onerror = () => rej(r.error);
    });

  const items = await getAll();
  const byId = new Map(items.map(i => [i.id, i]));

  const puts: Promise<void>[] = orderedIds.map((id, idx) => {
    const item = byId.get(id);
    if (!item) return Promise.resolve();
    const updated = { ...item, order: idx };
    return new Promise((res, rej) => {
      const r = store.put(updated);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  });

  await Promise.all(puts);
}
