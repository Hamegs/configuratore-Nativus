import React, { useState } from 'react';
import type { CartResult } from '../../engine/cart-calculator';
import type { CartProcedureStep } from '../../types/cart';
import type { ResolvedProcedure } from '../../engine/step-resolver';
import { toProceduralStep } from '../../engine/time-sanding-enricher';
import { stepTypeLabel, macroLabel, formatQty } from '../../utils/formatters';

interface VistaApplicatoreProps {
  result: CartResult;
}

export function VistaApplicatore({ result }: VistaApplicatoreProps) {
  const { procedure_floor, procedure_wall, procedure_texture, procedure_protettivi, summary } = result;
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['floor-0']));

  function toggle(key: string) {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  }

  const allAlerts = summary.hard_notes;

  return (
    <div className="space-y-6">
      {allAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Alert operativi</h2>
          {allAlerts.map((a, i) => (
            <div key={i} className="alert-hard text-sm">{a.text}</div>
          ))}
        </div>
      )}

      {procedure_floor && (
        <ProcedureSection
          label={`Preparazione Pavimento (${macroLabel('FLOOR')})`}
          procedure={procedure_floor}
          expanded={expanded}
          toggle={toggle}
          sectionKey="floor"
          badgeColor="bg-stone-600"
        />
      )}
      {procedure_wall && (
        <ProcedureSection
          label={`Preparazione Pareti (${macroLabel('WALL')})`}
          procedure={procedure_wall}
          expanded={expanded}
          toggle={toggle}
          sectionKey="wall"
          badgeColor="bg-stone-600"
        />
      )}

      {procedure_texture && procedure_texture.length > 0 && (
        <TextureProtettiviSection
          label="Texture"
          steps={procedure_texture}
          expanded={expanded}
          toggle={toggle}
          sectionKey="tex"
          badgeColor="bg-brand-600"
        />
      )}

      {procedure_protettivi && procedure_protettivi.length > 0 && (
        <TextureProtettiviSection
          label="Protettivi"
          steps={procedure_protettivi}
          expanded={expanded}
          toggle={toggle}
          sectionKey="prot"
          badgeColor="bg-teal-600"
        />
      )}

      {!procedure_floor && !procedure_wall && procedure_texture.length === 0 && procedure_protettivi.length === 0 && (
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
  sectionKey,
  badgeColor,
}: {
  label: string;
  procedure: ResolvedProcedure;
  expanded: Set<string>;
  toggle: (k: string) => void;
  sectionKey: string;
  badgeColor: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">{label}</h2>
      {procedure.steps.map((rawStep, idx) => {
        const step = toProceduralStep(rawStep);
        const key = `${sectionKey}-${idx}`;
        const isOpen = expanded.has(key);
        const hasDetails = !!(step.operational_note || step.hard_alerts.length > 0);

        return (
          <div key={idx} className="card">
            <div
              className={`flex items-start gap-3 px-4 py-3 ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => hasDetails && toggle(key)}
            >
              <span className={`step-badge shrink-0 ${
                step.step_type_id === 'MECH' ? 'bg-gray-600 text-white' :
                step.step_type_id === 'PRIM' ? 'bg-blue-600 text-white' :
                step.step_type_id === 'WPRO' ? 'bg-teal-600 text-white' :
                step.step_type_id === 'STRC' ? 'bg-brand-600 text-white' :
                step.step_type_id === 'ARMR' ? 'bg-purple-600 text-white' :
                step.step_type_id === 'WAIT' ? 'bg-amber-500 text-white' :
                step.step_type_id === 'GATE' ? 'bg-red-600 text-white' :
                badgeColor + ' text-white'
              }`}>
                {Math.round(step.step_order / 10)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-400">{stepTypeLabel(step.step_type_id)}</span>
                <p className="font-medium text-gray-800 mt-0.5">{step.name}</p>
                {step.qty !== null && step.qty_total !== undefined && (
                  <p className="text-sm text-brand-700 font-medium">
                    {formatQty(step.qty, step.unit ?? '')} · Totale: {step.qty_total.toFixed(2)} kg
                  </p>
                )}
              </div>
              {hasDetails && <span className="shrink-0 text-gray-400">{isOpen ? '▲' : '▼'}</span>}
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

function TextureProtettiviSection({
  label,
  steps,
  expanded,
  toggle,
  sectionKey,
  badgeColor,
}: {
  label: string;
  steps: CartProcedureStep[];
  expanded: Set<string>;
  toggle: (k: string) => void;
  sectionKey: string;
  badgeColor: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">{label}</h2>
      {steps.map((step, idx) => {
        const key = `${sectionKey}-${idx}`;
        const isOpen = expanded.has(key);
        const hasDetails = !!(step.note || step.potlife_min || step.t_min_h || step.diluizione || step.hard_alerts.length > 0);

        return (
          <div key={idx} className="card">
            <div
              className={`flex items-start gap-3 px-4 py-3 ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => hasDetails && toggle(key)}
            >
              <span className={`step-badge shrink-0 ${badgeColor} text-white`}>
                {Math.round(step.step_order / 10)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-400 capitalize">{step.section}</span>
                <p className="font-medium text-gray-800 mt-0.5">{step.name}</p>
                {step.qty_total_kg !== null && step.qty_total_kg !== undefined && (
                  <p className="text-sm text-brand-700 font-medium">
                    Totale: {step.qty_total_kg.toFixed(2)} {step.unit ?? 'kg'}
                  </p>
                )}
                {step.t_min_h && (
                  <p className="text-xs text-amber-600">
                    Attesa min: {step.t_min_h} h
                    {step.t_max_h ? ` · max: ${step.t_max_h} h` : ''}
                    {step.potlife_min ? ` · potlife: ${step.potlife_min} min` : ''}
                  </p>
                )}
              </div>
              {hasDetails && <span className="shrink-0 text-gray-400">{isOpen ? '▲' : '▼'}</span>}
            </div>
            {isOpen && hasDetails && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                {step.diluizione && (
                  <p className="text-xs text-gray-600"><strong>Diluizione:</strong> {step.diluizione}</p>
                )}
                {step.note && (
                  <p className="text-sm text-gray-700 font-mono bg-white rounded border border-gray-100 px-3 py-2">
                    {step.note}
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
