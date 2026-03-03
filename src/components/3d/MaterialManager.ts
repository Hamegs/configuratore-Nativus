import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FinishType =
  | 'OPACO'
  | 'LUCIDO'
  | 'SATINATO'
  | 'MATERICO'
  | 'CERA_LUCIDA'
  | 'PROTEGGO_COLOR_OPACO'
  | undefined;

export interface MaterialConfig {
  color: string | THREE.ColorRepresentation;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
}

export interface PBRFinishConfig {
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  normalIntensity: number;
  envMapIntensity: number;
}

// ─── Base texture colors ─────────────────────────────────────────────────────

const TEXTURE_MATERIAL_MAP: Record<string, MaterialConfig> = {
  NATURAL:  { color: '#C8B48C', roughness: 0.85, metalness: 0.00, envMapIntensity: 0.25 },
  SENSE:    { color: '#9B8FBF', roughness: 0.28, metalness: 0.04, envMapIntensity: 0.65 },
  DEKORA:   { color: '#D4847A', roughness: 0.65, metalness: 0.00, envMapIntensity: 0.30 },
  LAMINE:   { color: '#8899AA', roughness: 0.15, metalness: 0.50, envMapIntensity: 1.00 },
  MATERIAL: { color: '#7A9E8A', roughness: 0.78, metalness: 0.00, envMapIntensity: 0.15 },
  CORLITE:  { color: '#C68A52', roughness: 0.80, metalness: 0.00, envMapIntensity: 0.20 },
  DEFAULT:  { color: '#CCBBAA', roughness: 0.82, metalness: 0.00, envMapIntensity: 0.25 },
};

// ─── PBR Finish configs ──────────────────────────────────────────────────────

export const FINISH_PBR: Record<string, PBRFinishConfig> = {
  OPACO: {
    roughness:         0.87,
    clearcoat:         0.00,
    clearcoatRoughness:1.00,
    normalIntensity:   1.00,
    envMapIntensity:   0.20,
  },
  LUCIDO: {
    roughness:         0.07,
    clearcoat:         0.95,
    clearcoatRoughness:0.06,
    normalIntensity:   0.28,
    envMapIntensity:   1.40,
  },
  CERA_LUCIDA: {
    roughness:         0.12,
    clearcoat:         0.80,
    clearcoatRoughness:0.10,
    normalIntensity:   0.35,
    envMapIntensity:   1.20,
  },
  SATINATO: {
    roughness:         0.45,
    clearcoat:         0.35,
    clearcoatRoughness:0.42,
    normalIntensity:   0.70,
    envMapIntensity:   0.70,
  },
  MATERICO: {
    roughness:         0.82,
    clearcoat:         0.00,
    clearcoatRoughness:1.00,
    normalIntensity:   2.20,
    envMapIntensity:   0.12,
  },
  PROTEGGO_COLOR_OPACO: {
    roughness:         0.84,
    clearcoat:         0.00,
    clearcoatRoughness:1.00,
    normalIntensity:   0.90,
    envMapIntensity:   0.18,
  },
};

export const DEFAULT_FINISH_PBR: PBRFinishConfig = {
  roughness:         0.82,
  clearcoat:         0.00,
  clearcoatRoughness:1.00,
  normalIntensity:   1.00,
  envMapIntensity:   0.25,
};

export const TEXTURE_SECTION_COLORS: Record<string, string> = {
  NATURAL:  '#C8B48C',
  SENSE:    '#9B8FBF',
  DEKORA:   '#D4847A',
  LAMINE:   '#8899AA',
  MATERIAL: '#7A9E8A',
  CORLITE:  '#C68A52',
};

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

export function getFloorMaterialConfig(
  textureLine: string | undefined,
  overrideColorHex: string | undefined,
  finish: FinishType,
): MaterialConfig {
  const base = TEXTURE_MATERIAL_MAP[textureLine ?? ''] ?? TEXTURE_MATERIAL_MAP.DEFAULT;
  const fc   = FINISH_PBR[finish ?? ''] ?? DEFAULT_FINISH_PBR;
  return {
    color:            overrideColorHex ?? base.color,
    roughness:        fc.roughness,
    metalness:        base.metalness,
    envMapIntensity:  fc.envMapIntensity,
  };
}

// ─── Procedural noise ────────────────────────────────────────────────────────

function frac(x: number): number { return x - Math.floor(x); }

function hash2d(ix: number, iy: number): number {
  return frac(Math.abs(Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453));
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const ux = xf * xf * (3 - 2 * xf);
  const uy = yf * yf * (3 - 2 * yf);
  const a = hash2d(xi,     yi);
  const b = hash2d(xi + 1, yi);
  const c = hash2d(xi,     yi + 1);
  const d = hash2d(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 3): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    v    += amp * valueNoise(x * freq, y * freq);
    amp  *= 0.5;
    freq *= 2.0;
  }
  return v;
}

// ─── Normal map generator ────────────────────────────────────────────────────

interface NormalMapConfig { scale: number; intensity: number; }

const NORMAL_MAP_CONFIGS: Record<string, NormalMapConfig> = {
  NATURAL:  { scale: 5.0, intensity: 2.2 },
  SENSE:    { scale: 3.5, intensity: 1.3 },
  DEKORA:   { scale: 6.0, intensity: 2.8 },
  LAMINE:   { scale: 2.0, intensity: 0.8 },
  MATERIAL: { scale: 7.0, intensity: 3.5 },
  CORLITE:  { scale: 4.5, intensity: 2.4 },
  DEFAULT:  { scale: 4.0, intensity: 1.8 },
};

function generateNormalMap(size: number, noiseScale: number, intensity: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const eps  = noiseScale / size;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const sx = (px / size) * noiseScale;
      const sy = (py / size) * noiseScale;
      const hC = fbm(sx,       sy);
      const hR = fbm(sx + eps, sy);
      const hU = fbm(sx,       sy + eps);

      const dX = (hC - hR) * intensity;
      const dY = (hC - hU) * intensity;
      const len = Math.sqrt(dX * dX + dY * dY + 1.0);

      const idx = (py * size + px) * 4;
      data[idx]     = Math.round((dX / len * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((dY / len * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((1.0 / len * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function generateRoughnessMap(size: number, base: number, variation: number): THREE.DataTexture {
  const SCALE = 8;
  const data  = new Uint8Array(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const n = fbm((px / size) * SCALE, (py / size) * SCALE, 2);
      const r = Math.min(1, Math.max(0, base + (n - 0.5) * variation));
      const v = Math.round(r * 255);
      const idx = (py * size + px) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Texture cache ───────────────────────────────────────────────────────────

const NORMAL_MAP_CACHE   = new Map<string, THREE.DataTexture>();
const ROUGHNESS_MAP_CACHE = new Map<string, THREE.DataTexture>();

export function getCachedNormalMap(textureLine: string, finish: FinishType): THREE.DataTexture {
  const key = `${textureLine}::${finish ?? 'none'}`;
  if (NORMAL_MAP_CACHE.has(key)) return NORMAL_MAP_CACHE.get(key)!;

  const cfg = NORMAL_MAP_CONFIGS[textureLine] ?? NORMAL_MAP_CONFIGS.DEFAULT;
  const intensityMultiplier =
    finish === 'MATERICO' ? 2.0 :
    finish === 'LUCIDO'   ? 0.25 :
    finish === 'SATINATO' ? 0.65 : 1.0;

  const map = generateNormalMap(128, cfg.scale, cfg.intensity * intensityMultiplier);
  map.repeat.set(4, 4);
  NORMAL_MAP_CACHE.set(key, map);
  return map;
}

export function getCachedRoughnessMap(textureLine: string, finish: FinishType): THREE.DataTexture {
  const key = `${textureLine}::${finish ?? 'none'}`;
  if (ROUGHNESS_MAP_CACHE.has(key)) return ROUGHNESS_MAP_CACHE.get(key)!;

  const fc  = FINISH_PBR[finish ?? ''] ?? DEFAULT_FINISH_PBR;
  const variation = finish === 'LUCIDO' ? 0.04 : finish === 'MATERICO' ? 0.18 : 0.10;
  const map = generateRoughnessMap(128, fc.roughness, variation);
  map.repeat.set(4, 4);
  ROUGHNESS_MAP_CACHE.set(key, map);
  return map;
}

// ─── PBR Material factory ────────────────────────────────────────────────────

export function createPBRMaterial(
  textureLine: string | undefined,
  colorHex:    string | undefined,
  finish:      FinishType,
): THREE.MeshPhysicalMaterial {
  const baseConfig  = TEXTURE_MATERIAL_MAP[textureLine ?? ''] ?? TEXTURE_MATERIAL_MAP.DEFAULT;
  const finishConfig = FINISH_PBR[finish ?? ''] ?? DEFAULT_FINISH_PBR;
  const normalMap   = getCachedNormalMap(textureLine ?? 'DEFAULT', finish);
  const roughnessMap = getCachedRoughnessMap(textureLine ?? 'DEFAULT', finish);

  return new THREE.MeshPhysicalMaterial({
    color:              colorHex ?? (baseConfig.color as string),
    roughness:          finishConfig.roughness,
    metalness:          baseConfig.metalness as number,
    clearcoat:          finishConfig.clearcoat,
    clearcoatRoughness: finishConfig.clearcoatRoughness,
    normalMap,
    normalScale:        new THREE.Vector2(finishConfig.normalIntensity, finishConfig.normalIntensity),
    roughnessMap,
    envMapIntensity:    finishConfig.envMapIntensity,
  });
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
