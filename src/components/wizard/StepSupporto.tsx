import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { buildQuestionsForSupport, areSubAnswersComplete, getAvailableSupporti } from './supporto-questions';
import type { SubQuestion } from './supporto-questions';
import { effectiveAmbiente, isEffectiveDin, isEffectiveShower } from '../../engine/effective-ambiente';
import type { Supporto } from '../../types/supporto';
import type { SubAnswers } from '../../types/wizard-state';

const store = loadDataStore();

function SubQuestionRow({ q, value, onChange, sub }: {
  q: SubQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  sub: SubAnswers;
}) {
  if (q.key === 'crepe_ml' && !sub.crepe) return null;

  if (q.type === 'yesno') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">
          {q.label}
          {!q.optional && <span className="ml-1 text-red-400">*</span>}
        </span>
        <div className="flex gap-4">
          {(['Sì', 'No'] as const).map(opt => (
            <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="radio"
                name={q.key}
                checked={value === (opt === 'Sì')}
                onChange={() => onChange(opt === 'Sì')}
                className="accent-brand-600"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === 'select' && q.options) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {q.label}
          {!q.optional && <span className="ml-1 text-red-400">*</span>}
        </label>
        <select
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className="select-field"
        >
          {q.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  if (q.type === 'number') {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {q.label}
          {!q.optional && <span className="ml-1 text-red-400">*</span>}
        </label>
        <input
          type="number" min="0" step="0.5"
          value={(value as number) ?? ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="input-field"
          placeholder="0"
        />
      </div>
    );
  }

  return null;
}

function SupportoSelect({ macro, value, onChange, envId, isDin, isShower }: {
  macro: 'FLOOR' | 'WALL';
  value: string | null;
  onChange: (v: string) => void;
  envId: string | null;
  isDin: boolean;
  isShower: boolean;
}) {
  const items = getAvailableSupporti(macro, envId, isDin, isShower, store.decisionTable, store.supporti);
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="select-field">
      <option value="">— Seleziona supporto —</option>
      {items.map((s: Supporto) => (
        <option key={s.support_id} value={s.support_id}>{s.name}</option>
      ))}
    </select>
  );
}

export function StepSupporto() {
  const state = useWizardStore();
  const {
    mq_pavimento, mq_pareti,
    supporto_floor, setSupportoFloor,
    supporto_wall, setSupportoWall,
    sub_answers_floor, setSubAnswerFloor,
    sub_answers_wall, setSubAnswerWall,
    active_blocks, nextStep, prevStep,
  } = state;

  const envId   = effectiveAmbiente(state);
  const isDin   = isEffectiveDin(state);
  const isShower = isEffectiveShower(state);
  const dt      = store.decisionTable;

  const needsFloor = mq_pavimento > 0;
  const needsWall  = mq_pareti > 0;

  const isFloorValid = !needsFloor || areSubAnswersComplete(supporto_floor, sub_answers_floor, envId, isDin, isShower, dt);
  const isWallValid  = !needsWall  || areSubAnswersComplete(supporto_wall,  sub_answers_wall,  envId, isDin, isShower, dt);
  const hasBlocks    = active_blocks.some(b => b.code !== 'LAME_NO_PATTERN');
  const canContinue  = isFloorValid && isWallValid && !hasBlocks;

  function renderQuestions(supportId: string | null, sub: SubAnswers, setAnswer: (k: keyof SubAnswers, v: never) => void) {
    if (!supportId) return null;
    // Pass current sub so conditional hollow/parquet questions appear dynamically
    const qs = buildQuestionsForSupport(supportId, envId, isDin, isShower, dt, sub);
    if (qs.length === 0) return (
      <p key={`qs-${supportId}`} className="text-xs text-gray-400 italic mt-2">
        Nessuna condizione aggiuntiva richiesta per questo supporto.
      </p>
    );
    return (
      <div key={`qs-${supportId}`} className="space-y-3 mt-4">
        {sub.hollow === 'ALL' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Attenzione:</strong> Tutte le piastrelle battono a vuoto. Si raccomanda la demolizione completa.
            Indicare il sistema di compensazione quota e lo spessore da recuperare.
          </div>
        )}
        {qs.map(q => (
          <SubQuestionRow
            key={q.key}
            q={q}
            value={sub[q.key as keyof SubAnswers]}
            onChange={v => setAnswer(q.key as keyof SubAnswers, v as never)}
            sub={sub}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StepHeader
        title="Supporto e stato"
        subtitle="Indica su cosa lavori. Verranno mostrate solo le domande rilevanti per il supporto e l'ambiente selezionati."
      />

      <BlockAlerts blocks={active_blocks} />

      {needsFloor && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Pavimento ({mq_pavimento} m²)</h2>
          <SupportoSelect macro="FLOOR" value={supporto_floor} onChange={setSupportoFloor}
            envId={envId} isDin={isDin} isShower={isShower} />
          {renderQuestions(supporto_floor, sub_answers_floor, setSubAnswerFloor)}
        </section>
      )}

      {needsWall && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Pareti ({mq_pareti} m²)</h2>
          <SupportoSelect macro="WALL" value={supporto_wall} onChange={setSupportoWall}
            envId={envId} isDin={isDin} isShower={isShower} />
          {renderQuestions(supporto_wall, sub_answers_wall, setSubAnswerWall)}
        </section>
      )}

      <StepNavigation canContinue={canContinue} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}
