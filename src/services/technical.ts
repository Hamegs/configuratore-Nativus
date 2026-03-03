import type { DataStore } from '../utils/data-loader';
import type { WizardState } from '../types/wizard-state';
import type { TechnicalGroup, ServiceSection } from '../types/services';
import type { TextureInput } from '../engine/texture-rules';
import { computeFullCart } from '../engine/cart-calculator';
import { getCommercialName } from '../utils/product-names';
import { effectiveAmbiente } from '../engine/effective-ambiente';

export interface TechnicalGroupEnriched extends TechnicalGroup {
  _textureInput?: TextureInput;
}

function extractDestination(description: string): string | null {
  const parts = description.split(' — ');
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  if (last === 'Pavimento' || last.startsWith('Parete')) return last;
  return null;
}

export function computeTechnicalGroups(
  state: WizardState,
  store: DataStore,
): TechnicalGroupEnriched[] {
  const groups: TechnicalGroupEnriched[] = [];
  const result = computeFullCart(store, state);

  for (const line of result.summary.lines) {
    if (line.section === 'texture') continue;

    const product_id =
      line.product_id ??
      store.packagingSku.find(s => s.sku_id === line.sku_id)?.product_id ??
      line.sku_id;
    const nomeCommerciale = getCommercialName(product_id) ?? line.descrizione;
    const destination = extractDestination(line.descrizione);

    let qty_raw: number;
    if (line.qty_raw !== undefined) {
      qty_raw = line.qty_raw;
    } else if (line.section === 'protettivi') {
      const step = result.procedure_protettivi.find(s => s.product_id === product_id);
      qty_raw =
        step?.qty_total_kg ??
        line.qty * (store.packagingSku.find(s => s.sku_id === line.sku_id)?.pack_size ?? 1);
    } else {
      qty_raw = line.qty * (line.pack_size ?? 1);
    }

    groups.push({
      id: `${product_id}::${line.section}::${line.descrizione}`,
      product_id,
      nomeCommerciale,
      description: line.descrizione,
      section: line.section as ServiceSection,
      destination,
      qty_raw,
      unit: line.pack_unit ?? 'kg',
    });
  }

  const wallSurfaces = state.surfaces.filter(s => s.type === 'WALL_PART');
  const allSteps = [
    ...(result.procedure_floor?.steps ?? []),
    ...(result.procedure_wall?.steps ?? []),
  ];
  const baseProducts = ['BARR_VAP_4', 'RAS_BASE_Q', 'RAS_BASE', 'FONDO_BASE'];
  let lastBase = 'RAS_BASE';
  for (const prod of baseProducts) {
    if (allSteps.some(s => s.product_id === prod)) { lastBase = prod; break; }
  }

  function buildTextureGroup(
    textureInput: TextureInput,
    zoneLabel: string | null,
    colorLabel: string | null,
    textureLine: string,
    area_mq: number,
  ): TechnicalGroupEnriched {
    let description = textureLine;
    if (colorLabel) description += ` — ${colorLabel}`;
    if (zoneLabel) description += ` — ${zoneLabel}`;
    return {
      id: `texture::${textureLine}::${colorLabel ?? ''}::${zoneLabel ?? 'all'}`,
      product_id: textureLine,
      nomeCommerciale: textureLine,
      description,
      section: 'texture',
      destination: zoneLabel,
      texture_line: textureLine,
      color_label: colorLabel ?? undefined,
      qty_raw: area_mq,
      unit: 'mq',
      _textureInput: textureInput,
    };
  }

  if (state.surfaces.length > 0) {
    for (const surface of state.surfaces) {
      if (!surface.texture_line || surface.mq <= 0) continue;
      const zoneLabel =
        surface.type === 'FLOOR'
          ? 'Pavimento'
          : wallSurfaces.length === 1
            ? 'Parete'
            : `Parete ${wallSurfaces.indexOf(surface) + 1}`;
      const colorLabel = surface.color_primary?.label ?? null;
      const textureInput: TextureInput = {
        line: surface.texture_line,
        style: surface.texture_style!,
        area_mq: surface.mq,
        macro: surface.type === 'FLOOR' ? 'FLOOR' : 'WALL',
        color_mode: surface.color_mode,
        color_primary: surface.color_primary,
        color_secondary: surface.color_secondary,
        lamine_pattern: surface.lamine_pattern,
        last_base_layer: lastBase,
        fughe_residue:
          surface.type === 'WALL_PART'
            ? (state.sub_answers_wall.fughe_residue ?? state.sub_answers_floor.fughe_residue)
            : state.sub_answers_floor.fughe_residue,
        env_id: effectiveAmbiente(state),
        zone_label: zoneLabel,
      };
      groups.push(buildTextureGroup(textureInput, zoneLabel, colorLabel, surface.texture_line, surface.mq));
    }
  } else if (state.texture_line) {
    const texArea = state.mq_pavimento + state.mq_pareti;
    const macro: 'FLOOR' | 'WALL' = state.mq_pavimento > 0 ? 'FLOOR' : 'WALL';
    const colorLabel = state.color_primary?.label ?? null;
    const textureInput: TextureInput = {
      line: state.texture_line,
      style: state.texture_style!,
      area_mq: texArea,
      macro,
      color_mode: state.color_mode,
      color_primary: state.color_primary,
      color_secondary: state.color_secondary,
      lamine_pattern: state.lamine_pattern,
      last_base_layer: lastBase,
      fughe_residue:
        state.sub_answers_wall.fughe_residue ?? state.sub_answers_floor.fughe_residue,
      env_id: effectiveAmbiente(state),
    };
    groups.push(buildTextureGroup(textureInput, null, colorLabel, state.texture_line, texArea));
  }

  return groups;
}
