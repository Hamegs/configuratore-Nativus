import type { ColorRepresentation } from 'three';

export interface MaterialConfig {
  color: ColorRepresentation;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
}

export interface LayerConfig {
  id: string;
  label: string;
  sublabel?: string;
  thickness_mm: number;
  consumption?: string;
  waiting_time?: string;
  color: string;
  section: string;
}

const TEXTURE_MATERIAL_MAP: Record<string, MaterialConfig> = {
  NATURAL:  { color: '#C8B48C', roughness: 0.85, metalness: 0.00, envMapIntensity: 0.3 },
  SENSE:    { color: '#9B8FBF', roughness: 0.28, metalness: 0.05, envMapIntensity: 0.6 },
  DEKORA:   { color: '#D4847A', roughness: 0.65, metalness: 0.00, envMapIntensity: 0.3 },
  LAMINE:   { color: '#8899AA', roughness: 0.18, metalness: 0.45, envMapIntensity: 0.9 },
  MATERIAL: { color: '#7A9E8A', roughness: 0.72, metalness: 0.00, envMapIntensity: 0.2 },
  CORLITE:  { color: '#C68A52', roughness: 0.78, metalness: 0.00, envMapIntensity: 0.2 },
  DEFAULT:  { color: '#CCBBAA', roughness: 0.80, metalness: 0.00, envMapIntensity: 0.3 },
};

export function getFloorMaterialConfig(
  textureLine: string | undefined,
  overrideColorHex: string | undefined,
  finish: 'OPACO' | 'LUCIDO' | 'CERA_LUCIDA' | 'PROTEGGO_COLOR_OPACO' | undefined,
): MaterialConfig {
  const base = TEXTURE_MATERIAL_MAP[textureLine ?? ''] ?? TEXTURE_MATERIAL_MAP.DEFAULT;
  let roughness = base.roughness;
  let metalness = base.metalness;
  let envMapIntensity = base.envMapIntensity;

  if (finish === 'LUCIDO' || finish === 'CERA_LUCIDA') {
    roughness  = Math.max(0.04, roughness - 0.45);
    metalness  = Math.min(0.30, metalness  + 0.10);
    envMapIntensity = Math.min(1.0, envMapIntensity + 0.4);
  } else if (finish === 'OPACO' || finish === 'PROTEGGO_COLOR_OPACO') {
    roughness  = Math.min(0.97, roughness  + 0.08);
    envMapIntensity = Math.max(0.1, envMapIntensity - 0.1);
  }

  return {
    color: overrideColorHex ?? base.color,
    roughness,
    metalness,
    envMapIntensity,
  };
}

const LAYER_COLOR_MAP: Record<string, string> = {
  support:   '#6B7280',
  barrier:   '#60A5FA',
  rasante:   '#FBB130',
  primer:    '#7DD3FC',
  texture:   '#A78BFA',
  protective:'#34D399',
  din:       '#FB923C',
};

export function getLayerColor(section: string): string {
  return LAYER_COLOR_MAP[section] ?? '#94A3B8';
}

export const TEXTURE_SECTION_COLORS: Record<string, string> = {
  NATURAL:  '#C8B48C',
  SENSE:    '#9B8FBF',
  DEKORA:   '#D4847A',
  LAMINE:   '#8899AA',
  MATERIAL: '#7A9E8A',
  CORLITE:  '#C68A52',
};
