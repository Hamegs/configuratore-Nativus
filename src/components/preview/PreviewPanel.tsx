import React, { useState } from 'react';
import { useProjectStore } from '../../store/project-store';
import { LayerStack } from './LayerStack';

export function PreviewPanel() {
  const rooms = useProjectStore(s => s.rooms);
  const configured = rooms.filter(r => r.is_configured && r.wizard_state);
  const [activeIdx, setActiveIdx] = useState(0);

  const room = configured[activeIdx] ?? null;
  const wiz = room?.wizard_state ?? null;

  const support = wiz?.supporto_floor ?? undefined;
  const texture = wiz?.texture_line ?? undefined;
  const color = wiz?.color_primary?.label ?? wiz?.color_primary?.code ?? undefined;
  const protective = wiz?.protettivo?.system ?? undefined;
  const hasRas = (wiz?.resolved_steps_floor?.length ?? 0) > 0;
  const hasBarrier = wiz?.resolved_steps_floor?.some(s => s.product_id?.includes('BARR_VAP')) ?? false;
  const hasPrimer = wiz?.resolved_steps_floor?.some(s => s.product_id?.includes('PRIMER')) ?? false;
  const rasanteStep = wiz?.resolved_steps_floor?.find(s =>
    s.product_id?.startsWith('RAS_') || s.product_id?.startsWith('S_RAS')
  );

  return (
    <div className="flex h-full flex-col bg-slate-800 text-slate-100">
      <div className="border-b border-slate-700 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Anteprima Stratigrafia
        </h3>
      </div>

      {configured.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl">
            ⬚
          </div>
          <p className="text-xs text-slate-500">Configura un ambiente per vedere la stratigrafia.</p>
        </div>
      ) : (
        <>
          {configured.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b border-slate-700 px-4 py-2">
              {configured.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
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

          <div className="flex-1 overflow-auto">
            <div className="px-2 py-3">
              <LayerStack
                support={support}
                hasBarrier={hasBarrier}
                rasante={rasanteStep?.product_id ?? undefined}
                hasPrimer={hasPrimer}
                texture={texture ?? undefined}
                color={color ?? undefined}
                protective={protective}
              />
            </div>

            {wiz && (
              <div className="border-t border-slate-700 px-4 py-3 space-y-1.5">
                {wiz.mq_pavimento > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Pavimento</span>
                    <span className="font-mono text-slate-200">{wiz.mq_pavimento} m²</span>
                  </div>
                )}
                {wiz.mq_pareti > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Pareti</span>
                    <span className="font-mono text-slate-200">{wiz.mq_pareti} m²</span>
                  </div>
                )}
                {wiz.texture_line && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Texture</span>
                    <span className="font-mono text-slate-200">{wiz.texture_line}</span>
                  </div>
                )}
                {color && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Colore</span>
                    <span className="font-mono text-slate-200 truncate ml-2 max-w-[120px]">{color}</span>
                  </div>
                )}
                {protective && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Protettivo</span>
                    <span className="font-mono text-slate-200">{protective}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
