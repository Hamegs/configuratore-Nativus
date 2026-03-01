import React, { useState } from 'react';
import type { CartResult } from '../../engine/cart-calculator';
import type { ResolvedProcedure } from '../../engine/step-resolver';
import { toProceduralStep } from '../../engine/time-sanding-enricher';
import { stepTypeLabel, macroLabel, formatQty } from '../../utils/formatters';

interface VistaApplicatoreProps {
  result: CartResult;
}

export function VistaApplicatore({ result }: VistaApplicatoreProps) {
  const { procedure_floor, procedure_wall, summary } = result;
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  function toggle(i: number) {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  }

  // Hard alerts
  const texAlerts = summary.hard_notes.filter(n => n.code.startsWith('TEX') || n.code.startsWith('PROT'));

  return (
    <div className="space-y-6">
      {texAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Alert operativi</h2>
          {texAlerts.map((a, i) => (
            <div key={i} className="alert-hard text-sm">{a.text}</div>
          ))}
        </div>
      )}

      {procedure_floor && (
        <ProcedureSection label={`Pavimento (${macroLabel('FLOOR')})`} procedure={procedure_floor} expanded={expanded} toggle={toggle} offset={0} />
      )}
      {procedure_wall && (
        <ProcedureSection label={`Pareti (${macroLabel('WALL')})`} procedure={procedure_wall} expanded={expanded} toggle={toggle} offset={procedure_floor?.steps.length ?? 0} />
      )}

      {!procedure_floor && !procedure_wall && (
        <div className="alert-info">Nessuna procedura generata. Verifica le selezioni nel wizard.</div>
      )}
    </div>
  );
}

function ProcedureSection({
  label,
  procedure,
  expanded,
  toggle,
  offset,
}: {
  label: string;
  procedure: ResolvedProcedure;
  expanded: Set<number>;
  toggle: (i: number) => void;
  offset: number;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">{label}</h2>
      {procedure.steps.map((rawStep, idx) => {
        const step = toProceduralStep(rawStep);
        const globalIdx = offset + idx;
        const isOpen = expanded.has(globalIdx);
        const hasDetails = !!(step.operational_note || step.hard_alerts.length > 0);

        return (
          <div key={idx} className="card">
            <div
              className={`flex items-start gap-3 px-4 py-3 ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => hasDetails && toggle(globalIdx)}
            >
              <span className={`step-badge shrink-0 ${
                step.step_type_id === 'MECH' ? 'bg-gray-600 text-white' :
                step.step_type_id === 'PRIM' ? 'bg-blue-600 text-white' :
                step.step_type_id === 'WPRO' ? 'bg-teal-600 text-white' :
                step.step_type_id === 'STRC' ? 'bg-brand-600 text-white' :
                step.step_type_id === 'ARMR' ? 'bg-purple-600 text-white' :
                step.step_type_id === 'WAIT' ? 'bg-amber-500 text-white' :
                step.step_type_id === 'GATE' ? 'bg-red-600 text-white' :
                'bg-gray-300 text-gray-700'
              }`}>
                {Math.round(step.step_order / 10)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">{stepTypeLabel(step.step_type_id)}</span>
                </div>
                <p className="font-medium text-gray-800 mt-0.5">{step.name}</p>
                {step.qty !== null && step.qty_total !== undefined && (
                  <p className="text-sm text-brand-700 font-medium">
                    {formatQty(step.qty, step.unit ?? '')} · Totale: {step.qty_total.toFixed(2)} kg
                  </p>
                )}
              </div>
              {hasDetails && (
                <span className="shrink-0 text-gray-400">{isOpen ? '▲' : '▼'}</span>
              )}
            </div>

            {isOpen && hasDetails && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                {step.operational_note && (
                  <p className="text-sm text-gray-700 font-mono bg-white rounded border border-gray-100 px-3 py-2">
                    {step.operational_note}
                  </p>
                )}
                {step.hard_alerts.map((a, i) => (
                  <div key={i} className="alert-hard text-sm">{a}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
