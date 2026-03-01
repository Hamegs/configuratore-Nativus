import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import type { DinInputValues } from '../../types/din';
import { validateDinInputs } from '../../engine/din-calculator';

const store = loadDataStore();

export function StepDin() {
  const { din_inputs, setDinInputs, active_blocks, nextStep, prevStep } = useWizardStore();

  const vals: DinInputValues = din_inputs ?? {
    DIN_DOCCE_PZ: 1,
    DIN_BBCORNER_IN_PZ: 0,
    DIN_BBCORNER_OUT_PZ: 0,
    DIN_BBPASS_PZ: 0,
    DIN_BBDRAIN_PZ: 0,
    DIN_BBTAPE_ML: 0,
    DIN_NORPHEN_ML: 0,
  };

  function updateVal(key: keyof DinInputValues, v: number) {
    setDinInputs({ ...vals, [key]: v });
  }

  const errors = validateDinInputs(vals);
  const isValid = errors.length === 0 && active_blocks.length === 0;

  return (
    <div className="space-y-8">
      <StepHeader title="Accessori DIN 18534" subtitle="Inserisci le quantità degli accessori per l'impermeabilizzazione DIN." />
      <BlockAlerts blocks={active_blocks} />

      {errors.length > 0 && (
        <div className="alert-hard">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <section className="card p-6 space-y-4">
        {store.dinInputs.map(inp => {
          const key = inp.input_id as keyof DinInputValues;
          return (
            <div key={inp.input_id} className="flex items-center justify-between gap-4">
              <label htmlFor={inp.input_id} className="text-sm font-medium text-gray-700 flex-1">
                {inp.label}
                <span className="ml-1 text-xs text-gray-400">({inp.unit})</span>
              </label>
              <input
                id={inp.input_id}
                type="number"
                min="0"
                step="1"
                value={vals[key] ?? 0}
                onChange={e => updateVal(key, parseInt(e.target.value) || 0)}
                className="input-field w-28 text-right"
              />
            </div>
          );
        })}
      </section>

      <StepNavigation canContinue={isValid} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}
