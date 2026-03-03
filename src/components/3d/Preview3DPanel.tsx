import React, { Suspense, lazy, useState, useMemo, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProjectStore } from '../../store/project-store';
import { useConfiguratorMode } from '../../context/ConfiguratorModeContext';
import { RoleGate } from '../ui/RoleGate';
import { Preview3DSwitch, defaultViewModeForRole } from './Preview3DSwitch';
import type { ViewMode3D } from './Preview3DSwitch';
import type { LayerConfig } from './MaterialManager';
import { getLayerColor, TEXTURE_SECTION_COLORS } from './MaterialManager';
import type { StepDefinition } from '../../types/step';

const LayerStack3DContent = lazy(() =>
  import('./LayerStack3D').then(m => ({ default: m.LayerStack3DContent }))
);
const RoomScene3DContent = lazy(() =>
  import('./RoomScene3D').then(m => ({ default: m.RoomScene3DContent }))
);

function buildLayersFromSteps(steps: StepDefinition[], textureLine?: string | null): LayerConfig[] {
  const layers: LayerConfig[] = [];

  for (const step of steps) {
    const pid = step.product_id ?? '';
    let section = 'rasante';
    let thickness = 1.5;
    let label = pid.replace(/_/g, ' ');
    let consumption = step.qty != null ? `${step.qty} ${step.unit ?? 'kg/m²'}` : undefined;

    if (pid.includes('BARR_VAP') || pid.includes('IMPERME')) {
      section = 'barrier'; thickness = 0.5; label = 'Barriera vapore';
    } else if (pid.includes('PRIMER') || pid.includes('PR_')) {
      section = 'primer'; thickness = 0.3; label = pid.includes('BOND') ? 'Primer Bond SW' : 'Primer SW';
    } else if (pid.startsWith('RAS_') || pid.startsWith('S_RAS')) {
      section = 'rasante'; thickness = 2.0;
      if (pid.includes('2K')) { label = 'Rasante 2K'; thickness = 3.5; }
      else if (pid.includes('Q') || pid.includes('QUARZO')) { label = 'Rasante Base Quarzo'; thickness = 2.5; }
      else { label = 'Rasante Base'; thickness = 2.0; }
    } else if (pid.includes('FONDO_BASE') || pid.includes('QUARZO_01')) {
      section = 'rasante'; thickness = 1.0;
      label = pid.includes('QUARZO') ? 'Quarzo Base' : 'Fondo Base';
    } else if (pid === 'NATURAL' || pid === 'SENSE' || pid === 'DEKORA' || pid === 'LAMINE' || pid === 'MATERIAL' || pid === 'CORLITE') {
      section = 'texture'; thickness = 2.5;
      label = pid;
    } else if (pid.includes('PROTEGGO') || pid.includes('PROT_')) {
      section = 'protective'; thickness = 0.8;
      if (pid.includes('OPACO')) label = 'Proteggo Opaco H2O';
      else if (pid.includes('LUCIDO')) label = 'Proteggo Lucido H2O';
      else if (pid.includes('FIX')) label = 'Proteggo Fix H2O';
      else label = 'Protettivo';
    } else if (pid.includes('RETE')) {
      section = 'rasante'; thickness = 0.2; label = 'Rete di vetro';
    }

    const tt_min = step.min_overcoat;
    const waiting_time = tt_min ? `Ricopertura: ${tt_min}` : undefined;

    layers.push({
      id: `${pid}-${layers.length}`,
      label,
      thickness_mm: thickness,
      consumption,
      waiting_time,
      color: getLayerColor(section),
      section,
    });
  }

  if (layers.length === 0 && textureLine) {
    layers.push({
      id: 'tx-placeholder',
      label: textureLine,
      thickness_mm: 2.5,
      color: TEXTURE_SECTION_COLORS[textureLine] ?? '#A78BFA',
      section: 'texture',
    });
  }

  return layers;
}

function CanvasFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="text-xs text-slate-500">Caricamento 3D…</span>
      </div>
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
    >
      <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor">
        <path d="M6 8L2 4h2.5V1h3v3H10L6 8ZM1 10h10v1H1v-1Z" />
      </svg>
      {label}
    </button>
  );
}

export function Preview3DPanel() {
  const mode = useConfiguratorMode();
  const rooms = useProjectStore(s => s.rooms);
  const configured = rooms.filter(r => r.is_configured && r.wizard_state);
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode3D>(defaultViewModeForRole(mode));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const room = configured[Math.min(activeIdx, configured.length - 1)] ?? null;
  const wiz = room?.wizard_state ?? null;

  const layers = useMemo(() => {
    const steps = wiz?.resolved_steps_floor ?? [];
    return buildLayersFromSteps(steps, wiz?.texture_line);
  }, [wiz?.resolved_steps_floor, wiz?.texture_line]);

  const colorHex: string | undefined = useMemo(() => {
    const cp = wiz?.color_primary;
    if (!cp) return undefined;
    if (cp.code && /^#[0-9A-Fa-f]{3,6}$/.test(cp.code)) return cp.code;
    return undefined;
  }, [wiz?.color_primary]);

  const roomType = useMemo(() => {
    const rType = room?.room_type;
    if (rType === 'BAGNO') return 'BATHROOM' as const;
    if (rType === 'DOCCIA' || wiz?.presenza_doccia) return 'SHOWER' as const;
    return 'LIVING' as const;
  }, [room?.room_type, wiz?.presenza_doccia]);

  const finish = wiz?.protettivo?.finitura ?? undefined;

  const handleExportSection = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `stratigrafia-${room?.custom_name ?? 'ambiente'}.png`;
    link.click();
  }, [room]);

  const handleExportRoom = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `stanza-${room?.custom_name ?? 'ambiente'}.png`;
    link.click();
  }, [room]);

  return (
    <div className="flex h-full flex-col bg-slate-800 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Vista 3D
        </span>
        <Preview3DSwitch value={viewMode} onChange={setViewMode} />
      </div>

      {/* Room selector tabs */}
      {configured.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-slate-700 px-3 py-1.5">
          {configured.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                i === activeIdx
                  ? 'bg-cyan-700 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {r.custom_name || r.room_type}
            </button>
          ))}
        </div>
      )}

      {/* 3D Canvas */}
      <div className="relative flex-1 min-h-0">
        {configured.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="text-3xl">⬚</div>
            <p className="text-xs text-slate-500">Configura un ambiente per la vista 3D.</p>
          </div>
        ) : (
          <Canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            camera={
              viewMode === 'SECTION'
                ? { position: [0, 0, 5], fov: 50 }
                : { position: [3.5, 2.5, 4.0], fov: 55 }
            }
            onCreated={({ gl }) => {
              gl.setClearColor('#0f172a', 1);
            }}
          >
            <Suspense fallback={null}>
              {viewMode === 'SECTION' ? (
                <LayerStack3DContent
                  layers={layers}
                  showTechnical={mode === 'TECHNICAL'}
                  textureLine={wiz?.texture_line ?? undefined}
                />
              ) : (
                <RoomScene3DContent
                  roomType={roomType}
                  textureLine={wiz?.texture_line ?? undefined}
                  colorHex={colorHex}
                  finish={finish}
                />
              )}
            </Suspense>
          </Canvas>
        )}
      </div>

      {/* Footer info + export */}
      {room && wiz && (
        <div className="border-t border-slate-700 px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 text-xs text-slate-400">
              {wiz.mq_pavimento > 0 && <span>{wiz.mq_pavimento} m² pav.</span>}
              {wiz.mq_pareti > 0 && <span>{wiz.mq_pareti} m² par.</span>}
              {layers.length > 0 && (
                <span className="text-cyan-400">{layers.length} strati</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <RoleGate allow={['SPEC']}>
                <ExportButton label="Esporta sezione" onClick={handleExportSection} />
              </RoleGate>
              <RoleGate allow={['SALES']}>
                <ExportButton label="Esporta render" onClick={handleExportRoom} />
              </RoleGate>
              <RoleGate allow={['TECHNICAL']}>
                <ExportButton label="Esporta PNG" onClick={viewMode === 'SECTION' ? handleExportSection : handleExportRoom} />
              </RoleGate>
            </div>
          </div>
          {wiz.texture_line && (
            <div className="text-xs text-slate-500">
              {wiz.texture_line}
              {wiz.color_primary?.label && <span className="ml-1 text-slate-400">· {wiz.color_primary.label}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
