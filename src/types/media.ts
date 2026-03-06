export type MediaCategory =
  | 'environments'
  | 'supports'
  | 'stratigraphies'
  | 'tools'
  | 'textures';

export interface MediaItem {
  id: string;
  category: MediaCategory;
  name: string;
  data: Blob;
  mimeType: string;
  size: number;
  order: number;
  createdAt: string;
  entityId?: string;
}

export interface MediaItemMeta {
  id: string;
  category: MediaCategory;
  name: string;
  mimeType: string;
  size: number;
  order: number;
  createdAt: string;
  entityId?: string;
  url?: string;
}
