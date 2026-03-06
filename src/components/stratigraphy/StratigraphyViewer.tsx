import React, { useMemo } from 'react';
import type { CartResult } from '../../engine/cart-calculator';
import type { CartLine } from '../../types/cart';
import { useAdminStore } from '../../store/admin-store';
import type { StratigraphyPhaseLabel } from '../../types/cms';

interface Props {
  cartResult: CartResult | null;
  cartLines: CartLine[];
}

const PHASE_COLORS: Record<StratigraphyPhaseLabel, { bg: string; border: string; label: string }> = {
  A: { bg: '#f5f0e8', border: '#d4c4a8', label: 'Preparazione' },
  B: { bg: '#eef2ef', border: '#8fa89a', label: 'Texture' },
  C: { bg: '#eef1f0', border: '#b8c4c2', label: 'Protezione' },
};

const SECTION_TO_PHASE: Record<string, StratigraphyPhaseLabel> = {
  fondo: 'A',
  texture: 'B',
  protettivi: 'C',
  din: 'A',
  speciale: 'A',
};

interface LayerInfo {
  phase: StratigraphyPhaseLabel;
  product_id: string;
  name: string;
  consumption?: string;
  section: string;
}

export function StratigraphyViewer({ cartResult, cartLines }: Props) {
  const { cms } = useAdminStore(s => ({ cms: s.cms }));

  const layers = useMemo<LayerInfo[]>(() => {
    if (!cartLines.length && !cartResult) return [];

    const appStepsMap = new Map(
      cms.applicationSteps.map(s => [s.product_id, s])
    );

    const allLines: CartLine[] = cartLines.length ? cartLines : (cartResult?.summary?.lines ?? []);

    const seen = new Set<string>();
    const result: LayerInfo[] = [];

    for (const line of allLines) {
      const pid = line.product_id ?? line.sku_id;
      const key = `${pid}::${line.section}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const appStep = pid ? appStepsMap.get(pid) : undefined;
      const phase = SECTION_TO_PHASE[line.section] ?? 'A';
      result.push({
        phase,
        product_id: pid,
        name: appStep?.step_name ?? line.descrizione ?? pid,
        consumption: appStep?.consumption,
        section: line.section,
      });
    }

    result.sort((a, b) => a.phase.localeCompare(b.phase));
    return result;
  }, [cartLines, cartResult, cms.applicationSteps]);

  const procedureSteps = useMemo(() => {
    if (!cartResult) return [];
    const steps = [
      ...(cartResult.procedure_floor?.steps ?? []),
      ...(cartResult.procedure_wall?.steps ?? []),
      ...cartResult.procedure_texture,
      ...cartResult.procedure_protettivi,
    ];
    return steps.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
  }, [cartResult]);

  if (!layers.length && !procedureSteps.length) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8c9aaa', fontSize: 12 }}>
        Configura l'ambiente per visualizzare la stratigrafia.
      </div>
    );
  }

  const grouped: Record<StratigraphyPhaseLabel, LayerInfo[]> = { A: [], B: [], C: [] };
  for (const l of layers) {
    grouped[l.phase].push(l);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c9aaa', marginBottom: 12 }}>
        Stratigrafia sistema
      </p>

      {(['C', 'B', 'A'] as StratigraphyPhaseLabel[]).map(phase => {
        const phLayers = grouped[phase];
        if (!phLayers.length) return null;
        const colors = PHASE_COLORS[phase];
        return (
          <div key={phase}>
            {phLayers.map((layer, idx) => (
              <div
                key={`${layer.product_id}::${idx}`}
                title={layer.consumption ? `Consumo: ${layer.consumption}` : undefined}
                style={{
                  background: colors.bg,
                  borderLeft: `3px solid ${colors.border}`,
                  padding: '8px 12px',
                  marginBottom: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  cursor: 'default',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#171e29' }}>{layer.name}</span>
                  {layer.product_id && (
                    <code style={{ fontSize: 9, color: '#8c9aaa', marginLeft: 8 }}>{layer.product_id}</code>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {layer.consumption && (
                    <span style={{ fontSize: 10, color: '#445164' }}>{layer.consumption}</span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: colors.border }}>
                    {colors.label}
                  </span>
                </div>
              </div>
            ))}
            <div style={{ height: 4 }} />
          </div>
        );
      })}

      <div style={{ marginTop: 6, padding: '6px 10px', background: '#f2f2f0', borderRadius: 4 }}>
        <span style={{ fontSize: 10, color: '#8c9aaa' }}>Supporto / Substrato</span>
      </div>

      {procedureSteps.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c9aaa', marginBottom: 8 }}>
            Passi procedura
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {procedureSteps.slice(0, 8).map((step, idx) => (
              <div key={idx} style={{ fontSize: 11, color: '#445164', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#b0b8c4', minWidth: 16 }}>{step.step_order ?? idx + 1}</span>
                <span>{step.name}</span>
                {step.product_id && <code style={{ fontSize: 9, color: '#b0b8c4' }}>{step.product_id}</code>}
              </div>
            ))}
            {procedureSteps.length > 8 && (
              <span style={{ fontSize: 10, color: '#8c9aaa' }}>+{procedureSteps.length - 8} altri passi…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
