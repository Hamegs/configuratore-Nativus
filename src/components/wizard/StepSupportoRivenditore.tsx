import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import { buildQuestionsForSupport, areSubAnswersComplete, getAvailableSupporti } from './supporto-questions';
import type { SubQuestion } from './supporto-questions';
import { getCompatibleSupporti } from '../../engine/supporto-compatibility';
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

function FilteredSupportoSelect({ macro, value, onChange, compatibleIds, envId, isDin, isShower }: {
  macro: 'FLOOR' | 'WALL';
  value: string | null;
  onChange: (v: string) => void;
  compatibleIds: Set<string>;
  envId: string | null;
  isDin: boolean;
  isShower: boolean;
}) {
  // First filter by env availability (only show supports with DT rules for this env)
  const available = getAvailableSupporti(macro, envId, isDin, isShower, store.decisionTable, store.supporti);
  const compatible = available.filter((s: Supporto) => compatibleIds.has(s.support_id));
  const rest = available.filter((s: Supporto) => !compatibleIds.has(s.support_id));

  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="select-field">
      <option value="">— Seleziona supporto —</option>
      {compatible.length > 0 && (
        <optgroup label="Compatibili con la texture selezionata">
          {compatible.map((s: Supporto) => (
            <option key={s.support_id} value={s.support_id}>{s.name}</option>
          ))}
        </optgroup>
      )}
      {rest.length > 0 && (
        <optgroup label="Altri supporti">
          {rest.map((s: Supporto) => (
            <option key={s.support_id} value={s.support_id}>{s.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

export function StepSupportoRivenditore() {
  const state = useWizardStore();
  const {
    mq_pavimento, mq_pareti,
    texture_line,
    supporto_floor, setSupportoFloor,
    supporto_wall, setSupportoWall,
    sub_answers_floor, setSubAnswerFloor,
    sub_answers_wall, setSubAnswerWall,
    active_blocks, nextStep, prevStep,
  } = state;

  const envId    = effectiveAmbiente(state);
  const isDin    = isEffectiveDin(state);
  const isShower = isEffectiveShower(state);
  const dt       = store.decisionTable;

  const compatFloor = new Set(
    getCompatibleSupporti(texture_line, envId, 'FLOOR', store.decisionTable, store.supporti)
      .map((s: Supporto) => s.support_id),
  );
  const compatWall = new Set(
    getCompatibleSupporti(texture_line, envId, 'WALL', store.decisionTable, store.supporti)
      .map((s: Supporto) => s.support_id),
  );

  const needsFloor = mq_pavimento > 0;
  const needsWall  = mq_pareti > 0;

  const isFloorValid = !needsFloor || areSubAnswersComplete(supporto_floor, sub_answers_floor, envId, isDin, isShower, dt);
  const isWallValid  = !needsWall  || areSubAnswersComplete(supporto_wall,  sub_answers_wall,  envId, isDin, isShower, dt);
  const hasBlocks    = active_blocks.some(b => b.code !== 'LAME_NO_PATTERN');
  const canContinue  = isFloorValid && isWallValid && !hasBlocks;

  function renderQuestions(supportId: string | null, sub: SubAnswers, setAnswer: (k: keyof SubAnswers, v: never) => void) {
    if (!supportId) return null;
    const qs = buildQuestionsForSupport(supportId, envId, isDin, isShower, dt);
    if (qs.length === 0) return (
      <p className="text-xs text-gray-400 italic mt-2">
        Nessuna condizione aggiuntiva richiesta per questo supporto.
      </p>
    );
    return (
      <div className="space-y-3 mt-4">
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
        subtitle="I supporti compatibili con la texture selezionata sono evidenziati in cima."
      />

      {texture_line && (
        <div className="flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-100 px-4 py-2">
          <span className="text-xs font-medium text-purple-700">Texture selezionata:</span>
          <span className="text-xs font-bold text-purple-900">{texture_line}</span>
          <span className="ml-auto text-xs text-purple-500">I supporti compatibili appaiono per primi</span>
        </div>
      )}

      <BlockAlerts blocks={active_blocks} />

      {needsFloor && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Pavimento ({mq_pavimento} m²)</h2>
          <FilteredSupportoSelect
            macro="FLOOR"
            value={supporto_floor}
            onChange={setSupportoFloor}
            compatibleIds={compatFloor}
            envId={envId}
            isDin={isDin}
            isShower={isShower}
          />
          {renderQuestions(supporto_floor, sub_answers_floor, setSubAnswerFloor)}
        </section>
      )}

      {needsWall && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Pareti ({mq_pareti} m²)</h2>
          <FilteredSupportoSelect
            macro="WALL"
            value={supporto_wall}
            onChange={setSupportoWall}
            compatibleIds={compatWall}
            envId={envId}
            isDin={isDin}
            isShower={isShower}
          />
          {renderQuestions(supporto_wall, sub_answers_wall, setSubAnswerWall)}
        </section>
      )}

      <StepNavigation canContinue={canContinue} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}
