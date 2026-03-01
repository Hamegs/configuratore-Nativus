import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { loadDataStore } from '../../utils/data-loader';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import type { Supporto } from '../../types/supporto';

const store = loadDataStore();

interface SubQuestion {
  key: string;
  label: string;
  type: 'yesno' | 'select' | 'number';
  options?: Array<{ value: string; label: string }>;
  applyIf?: (support_id: string) => boolean;
}

const FLOOR_SUB_QUESTIONS: SubQuestion[] = [
  { key: 'cohesion', label: 'Il supporto è sfarinante?', type: 'yesno', applyIf: () => true },
  { key: 'humidity_band', label: 'Presenza di umidità di risalita?', type: 'select', options: [
    { value: '', label: '— Seleziona —' },
    { value: 'NONE', label: 'No' },
    { value: 'LOW', label: 'Bassa (umidità ordinaria)' },
    { value: 'HIGH', label: 'Alta (struttura umida)' },
    { value: 'RISING', label: 'Risalita capillare (STOP — contattare assistenza)' },
  ]},
  { key: 'cracks', label: 'Presenza di crepe?', type: 'yesno' },
  { key: 'crepe_ml', label: 'Lunghezza totale crepe (ml)', type: 'number', applyIf: (_id) => true },
  { key: 'hollow', label: 'Piastrelle a vuoto?', type: 'select', options: [
    { value: '', label: '— Seleziona —' },
    { value: 'NONE', label: 'Nessun vuoto' },
    { value: 'PUNCTUAL', label: 'Vuoti puntuali (ripristino)' },
    { value: 'ALL', label: 'Tutte vuote (demolizione + comp. quota)' },
  ], applyIf: (id) => id === 'F_TILE' },
  { key: 'parquet_comp', label: 'Compensazione quota post-rimozione', type: 'select', options: [
    { value: '', label: '— Seleziona —' },
    { value: 'AS', label: 'Autolivellante AS' },
    { value: 'EP', label: 'Massetto epossidico' },
  ], applyIf: (id) => id === 'F_PAR_RM' },
];

const WALL_SUB_QUESTIONS: SubQuestion[] = [
  { key: 'cohesion', label: 'Supporto sfarinante?', type: 'yesno' },
  { key: 'cracks', label: 'Presenza di crepe?', type: 'yesno' },
  { key: 'fughe_residue', label: 'Fughe residue (piastrelle/mosaico)?', type: 'select', options: [
    { value: 'OK', label: 'OK (ordinarie)' },
    { value: 'CRITICHE', label: 'Critiche (richiedono passaggio extra fondo)' },
  ], applyIf: (id) => id === 'W_TILE' || id === 'W_MOS' },
  { key: 'piatto_doccia', label: 'Piatto doccia', type: 'select', options: [
    { value: 'NUOVO', label: 'Nuovo (massetto epossidico)' },
    { value: 'ESISTENTE', label: 'Esistente (scasso e sigillatura)' },
  ], applyIf: (id) => id === 'W_SHW_MOD' || id === 'W_DIN' },
];

function SubQuestionRow({
  q,
  value,
  onChange,
  support_id,
  show_crepe_ml,
}: {
  q: SubQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  support_id: string;
  show_crepe_ml?: boolean;
}) {
  if (q.applyIf && !q.applyIf(support_id)) return null;
  if (q.key === 'crepe_ml' && !show_crepe_ml) return null;

  if (q.type === 'yesno') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">{q.label}</span>
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
        <label className="block text-sm font-medium text-gray-700 mb-2">{q.label}</label>
        <select
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className="select-field"
        >
          {q.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (q.type === 'number') {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">{q.label}</label>
        <input
          type="number"
          min="0"
          step="0.5"
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

function SupportoSelect({
  macro,
  value,
  onChange,
}: {
  macro: 'FLOOR' | 'WALL';
  value: string | null;
  onChange: (v: string) => void;
}) {
  const items = store.supporti.filter(s => s.macro_id === macro);
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
  const {
    mq_pavimento, mq_pareti,
    supporto_floor, setSupportoFloor,
    supporto_wall, setSupportoWall,
    sub_answers_floor, setSubAnswerFloor,
    sub_answers_wall, setSubAnswerWall,
    active_blocks, nextStep, prevStep,
  } = useWizardStore();

  const needsFloor = mq_pavimento > 0;
  const needsWall = mq_pareti > 0;

  const isFloorValid = !needsFloor || !!supporto_floor;
  const isWallValid = !needsWall || !!supporto_wall;
  const hasBlocks = active_blocks.some(b => b.code !== 'LAME_NO_PATTERN');
  const isValid = isFloorValid && isWallValid && !hasBlocks;

  return (
    <div className="space-y-8">
      <StepHeader
        title="Supporto e stato"
        subtitle="Indica su cosa lavori e le condizioni del supporto."
      />

      <BlockAlerts blocks={active_blocks} />

      {needsFloor && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Pavimento ({mq_pavimento} m²)</h2>
          <SupportoSelect macro="FLOOR" value={supporto_floor} onChange={setSupportoFloor} />
          {supporto_floor && (
            <div className="space-y-3 mt-4">
              {FLOOR_SUB_QUESTIONS.map(q => (
                <SubQuestionRow
                  key={q.key}
                  q={q}
                  value={sub_answers_floor[q.key as keyof typeof sub_answers_floor]}
                  onChange={v => setSubAnswerFloor(q.key as keyof typeof sub_answers_floor, v as never)}
                  support_id={supporto_floor}
                  show_crepe_ml={!!sub_answers_floor.crepe}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {needsWall && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Pareti ({mq_pareti} m²)</h2>
          <SupportoSelect macro="WALL" value={supporto_wall} onChange={setSupportoWall} />
          {supporto_wall && (
            <div className="space-y-3 mt-4">
              {WALL_SUB_QUESTIONS.map(q => (
                <SubQuestionRow
                  key={q.key}
                  q={q}
                  value={sub_answers_wall[q.key as keyof typeof sub_answers_wall]}
                  onChange={v => setSubAnswerWall(q.key as keyof typeof sub_answers_wall, v as never)}
                  support_id={supporto_wall}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <StepNavigation canContinue={isValid} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}
