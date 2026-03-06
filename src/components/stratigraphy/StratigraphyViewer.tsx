import React, { useMemo, useEffect, useState } from 'react';
import type { CartResult } from '../../engine/cart-calculator';
import type { CartLine, CartProcedureStep } from '../../types/cart';
import type { StepDefinition } from '../../types/step';
import { useAdminStore } from '../../store/admin-store';
import { loadDataStore } from '../../utils/data-loader';
import { getMediaBlob } from '../../store/media-store';

interface Props {
  cartResult: CartResult | null;
  cartLines: CartLine[];
  supportId?: string;
  textureLine?: string;
  environmentType?: string;
}

type PhaseLabel = 'A' | 'B' | 'C';

const PHASE_META: Record<PhaseLabel, { label: string; bg: string; border: string }> = {
  A: { label: 'Preparazione', bg: '#f5f0e8', border: '#d4c4a8' },
  B: { label: 'Texture',      bg: '#eef2ef', border: '#8fa89a' },
  C: { label: 'Protezione',   bg: '#eef1f0', border: '#b8c4c2' },
};

const SECTION_PHASE: Record<string, PhaseLabel> = {
  fondo: 'A', din: 'A', speciale: 'A', tracce: 'A',
  texture: 'B',
  protettivi: 'C',
};

interface LayerEntry {
  phase: PhaseLabel;
  step_id?: string;
  product_id?: string;
  label: string;
  qty?: string;
  section: string;
  tool_ids: string[];
  cleaning_method: string;
  technical_notes: string;
}

export function StratigraphyViewer({
  cartResult,
  cartLines,
  supportId,
  textureLine,
  environmentType,
}: Props) {
  const { cms } = useAdminStore(s => ({ cms: s.cms }));

  const [stratImages, setStratImages] = useState<string[]>([]);

  const layers = useMemo<LayerEntry[]>(() => {
    const store = loadDataStore();
    const stepLibMap = new Map(store.stepLibrary.map(s => [s.step_id, s]));
    const stepManualsMap = new Map(cms.stepManuals.map(m => [m.step_id, m]));

    type AnyStep = (StepDefinition | CartProcedureStep) & { step_id?: string; step_order?: number };

    const preparationSteps: AnyStep[] = [
      ...(cartResult?.procedure_floor?.steps ?? []),
      ...(cartResult?.procedure_wall?.steps ?? []),
    ];
    const textureSteps: AnyStep[] = cartResult?.procedure_texture ?? [];
    const protSteps: AnyStep[] = cartResult?.procedure_protettivi ?? [];

    const allSteps: { step: AnyStep; phase: PhaseLabel }[] = [
      ...preparationSteps.map(s => ({ step: s, phase: 'A' as PhaseLabel })),
      ...textureSteps.map(s => ({ step: s, phase: 'B' as PhaseLabel })),
      ...protSteps.map(s => ({ step: s, phase: 'C' as PhaseLabel })),
    ].sort((a, b) => (a.step.step_order ?? 0) - (b.step.step_order ?? 0));

    const seen = new Set<string>();
    const result: LayerEntry[] = [];

    for (const { step, phase } of allSteps) {
      const key = `${step.product_id ?? ''}::${step.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const stepId = (step as StepDefinition).step_id;
      const libEntry = stepId ? stepLibMap.get(stepId) : undefined;
      void libEntry;
      const manual = stepId ? stepManualsMap.get(stepId) : undefined;

      let qtyStr: string | undefined;
      const asPrep = step as StepDefinition;
      const asTex = step as CartProcedureStep;
      if (asPrep.qty_total != null && asPrep.unit) {
        qtyStr = `${asPrep.qty_total.toFixed(2)} ${asPrep.unit}`;
      } else if (asTex.qty_total_kg != null && asTex.unit) {
        qtyStr = `${asTex.qty_total_kg.toFixed(2)} ${asTex.unit}`;
      }

      result.push({
        phase,
        step_id: stepId,
        product_id: step.product_id ?? undefined,
        label: step.name,
        qty: qtyStr,
        section: (step as CartProcedureStep).section ?? (phase === 'A' ? 'fondo' : phase === 'B' ? 'texture' : 'protettivi'),
        tool_ids: manual?.tool_ids ?? [],
        cleaning_method: manual?.cleaning_method ?? '',
        technical_notes: manual?.technical_notes ?? '',
      });
    }

    if (result.length === 0) {
      const lines = cartLines.length ? cartLines : (cartResult?.summary?.lines ?? []);
      const seenL = new Set<string>();
      for (const line of lines) {
        const pid = line.product_id ?? line.sku_id;
        const k = `${pid}::${line.section}`;
        if (seenL.has(k)) continue;
        seenL.add(k);
        const phase = SECTION_PHASE[line.section] ?? 'A';
        result.push({
          phase,
          product_id: pid,
          label: line.descrizione ?? pid,
          section: line.section,
          tool_ids: [],
          cleaning_method: '',
          technical_notes: '',
        });
      }
    }

    return result.sort((a, b) => a.phase.localeCompare(b.phase));
  }, [cartResult, cartLines, cms.stepManuals]);

  useEffect(() => {
    if (!supportId) return;
    const match = cms.stratigraphyMedia.find(cfg => {
      if (cfg.support_id !== supportId) return false;
      if (cfg.system_name && textureLine && cfg.system_name !== textureLine) return false;
      if (cfg.environment_type && environmentType && cfg.environment_type !== environmentType) return false;
      return true;
    });
    if (!match) { setStratImages([]); return; }
    Promise.all(
      match.media_ids.map(id => getMediaBlob('stratigraphies', id))
    ).then(urls => setStratImages(urls.filter(Boolean) as string[]));
  }, [supportId, textureLine, environmentType, cms.stratigraphyMedia]);

  if (!layers.length) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 16px', color: '#8c9aaa', fontSize: 12 }}>
        Configura l'ambiente per visualizzare la stratigrafia.
      </div>
    );
  }

  const grouped: Record<PhaseLabel, LayerEntry[]> = { A: [], B: [], C: [] };
  for (const l of layers) grouped[l.phase].push(l);

  const toolsMap = new Map(cms.tools.map(t => [t.id, t.name]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c9aaa', marginBottom: 12 }}>
        Stratigrafia sistema
      </p>

      {stratImages.length > 0 && (
        <div style={{ marginBottom: 14, display: 'flex', gap: 8, overflowX: 'auto' }}>
          {stratImages.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="Diagramma stratigrafico"
              style={{ height: 90, borderRadius: 4, border: '1px solid #e2e4e0', objectFit: 'contain', background: '#fff' }}
            />
          ))}
        </div>
      )}

      {(['C', 'B', 'A'] as PhaseLabel[]).map(phase => {
        const phaseLayers = grouped[phase];
        if (!phaseLayers.length) return null;
        const meta = PHASE_META[phase];
        return (
          <div key={phase}>
            {phaseLayers.map((layer, idx) => (
              <div
                key={`${layer.product_id ?? layer.label}::${idx}`}
                title={[
                  layer.technical_notes,
                  layer.tool_ids.length ? `Strumenti: ${layer.tool_ids.map(id => toolsMap.get(id) ?? id).join(', ')}` : '',
                  layer.cleaning_method ? `Pulizia: ${layer.cleaning_method}` : '',
                ].filter(Boolean).join('\n') || undefined}
                style={{
                  background: meta.bg,
                  borderLeft: `3px solid ${meta.border}`,
                  padding: '7px 12px',
                  marginBottom: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  transition: 'opacity 0.15s',
                  cursor: layer.technical_notes || layer.tool_ids.length ? 'help' : 'default',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#171e29' }}>{layer.label}</span>
                  {layer.product_id && (
                    <code style={{ fontSize: 9, color: '#8c9aaa', marginLeft: 8 }}>{layer.product_id}</code>
                  )}
                  {layer.tool_ids.length > 0 && (
                    <span style={{ fontSize: 9, color: '#8c9aaa', marginLeft: 8 }}>
                      {layer.tool_ids.map(id => toolsMap.get(id) ?? id).join(', ')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {layer.qty && <span style={{ fontSize: 10, color: '#445164' }}>{layer.qty}</span>}
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: meta.border }}>
                    {meta.label}
                  </span>
                </div>
              </div>
            ))}
            <div style={{ height: 4 }} />
          </div>
        );
      })}

      <div style={{ padding: '6px 10px', background: '#f2f2f0', borderRadius: 4 }}>
        <span style={{ fontSize: 10, color: '#8c9aaa' }}>Supporto / Substrato</span>
      </div>
    </div>
  );
}
