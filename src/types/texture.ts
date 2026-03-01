import type { TextureLineId, TextureStyleId } from './enums';

export interface TextureLine {
  line_id: TextureLineId;
  name: string;
  notes: string;
}

export interface TextureStyle {
  style_id: TextureStyleId;
  name: string;
  passes_total: number;
  color_roles: string;
  rules: string;
}

export interface LaminePattern {
  pattern_id: string;
  name: string;
}

export interface ColorPalette {
  palette_id: string;
  name: string;
  standard: string;
}

export interface PaletteColor {
  palette_id: string;
  color_id: string;
  label: string;
  family: string;
  shade: string;
  is_active: boolean;
}

export interface RalColor {
  ral_id: string;
  ral_code: string;
  ral_label: string;
  is_active: boolean;
}

export interface NcsColor {
  ncs_id: string;
  ncs_code: string;
  ncs_label: string;
  is_active: boolean;
}

export interface PantoneColor {
  pantone_id: string;
  pantone_code: string;
  pantone_suffix: string;
  pantone_label: string;
  is_active: boolean;
}

export interface ColorSelection {
  type: 'NATURAL_24' | 'SENSE_24' | 'DEKORA_24' | 'RAL' | 'NCS' | 'PANTONE_C' | 'ALTRO';
  color_id?: string;
  label: string;
  code?: string;
}

export interface TextureOrderRule {
  rule_id: string;
  line_id: TextureLineId;
  mode: string;
  style_id: string;
  pack_policy: string;
  logic: string;
}

export interface TexturePackagingSku {
  sku_id: string;
  line_id: string;
  pack_size_mq: number | null;
  component: string;
  mode: string;
  param: string;
  product_id: string;
  pack_driver: string;
  pack_size: number | null;
  pack_unit: string;
  notes: string;
}

export interface TexOpParam {
  item: string;
  potlife_min: string;
  min_overcoat: string;
  max_overcoat: string;
  sanding: string;
}

export interface ColorStandard {
  standard_id: string;
  name: string;
}
