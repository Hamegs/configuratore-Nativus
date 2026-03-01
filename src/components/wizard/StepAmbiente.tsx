import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import type { WizardVisibleAmbiente } from '../../types/enums';

const AMBIENTI: { id: WizardVisibleAmbiente; label: string; desc: string }[] = [
  { id: 'ORD', label: 'Soggiorno / Cucina / Camera', desc: 'Locali ordinari asciutti' },
  { id: 'BAG', label: 'Bagno', desc: 'Bagno, lavanderia, locali umidi' },
];

// ─── Shared step layout helpers (used by other steps via re-export) ──────────

interface StepHeaderProps { title: string; subtitle?: string }
export function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

interface StepNavProps { canContinue: boolean; onNext: () => void; onPrev: () => void; nextLabel?: string; isLastStep?: boolean }
export function StepNavigation({ canContinue, onNext, onPrev, nextLabel = 'Avanti →' }: StepNavProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <button type="button" className="btn-secondary" onClick={onPrev}>← Indietro</button>
      <button type="button" className="btn-primary" disabled={!canContinue} onClick={onNext}>{nextLabel}</button>
    </div>
  );
}

// ─── NumField helper ─────────────────────────────────────────────────────────

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  step?: number;
}
function NumField({ label, value, onChange, unit = '', min = 0, step = 0.1 }: NumFieldProps) {
  return (
    <div>
      <label className="label-text">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          step={step}
          className="input-field w-28"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

export function StepAmbiente() {
  const {
    ambiente, mq_pavimento, mq_pareti,
    presenza_doccia, mercato_tedesco,
    doccia_larghezza, doccia_lunghezza, doccia_altezza_rivestimento,
    doccia_piatto_type,
    doccia_raccordi_standard, doccia_raccordi_grandi,
    doccia_bbcorner_in, doccia_bbcorner_out,
    doccia_bbtape_ml, doccia_norphen_ml,
    doccia_nicchie,
    setAmbiente, setMqPavimento, setMqPareti,
    setPresenzaDoccia, setMercatoTedesco,
    setDocciaLarghezza, setDocciaLunghezza, setDocciaAltezza,
    setDocciaPiattoType,
    setDocciaRaccordiStandard, setDocciaRaccordiGrandi,
    setDocciaBbcornerIn, setDocciaBbcornerOut,
    setDocciaBbtapeMl, setDocciaNorphenMl,
    setDoccianicchie,
  } = useWizardStore();

  const isBag = ambiente === 'BAG';
  const mqDocciaPav = doccia_larghezza * doccia_lunghezza;
  const mqDocciaPareti = 2 * (doccia_larghezza + doccia_lunghezza) * doccia_altezza_rivestimento;

  return (
    <div className="space-y-6">
      {/* Card 1 — Tipo ambiente */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Tipo di ambiente</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AMBIENTI.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAmbiente(a.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                ambiente === a.id
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`font-semibold text-sm ${ambiente === a.id ? 'text-brand-700' : 'text-gray-800'}`}>
                {a.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Card 2 — Superfici */}
      {ambiente && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Superfici</h2>
          <div className="flex flex-wrap gap-6">
            <NumField label="Pavimento" value={mq_pavimento} onChange={setMqPavimento} unit="m²" step={0.5} />
            <NumField label="Pareti" value={mq_pareti} onChange={setMqPareti} unit="m²" step={0.5} />
          </div>
          {mq_pavimento === 0 && mq_pareti === 0 && (
            <p className="text-xs text-amber-600 mt-2">Inserisci almeno una superficie per proseguire.</p>
          )}
        </div>
      )}

      {/* Card 3 — Bagno opzioni speciali */}
      {isBag && (
        <div className="card p-5 space-y-5">
          <h2 className="font-semibold text-gray-900">Bagno — opzioni speciali</h2>

          {/* Toggle Presenza Doccia */}
          <div className="flex items-start gap-3">
            <input
              id="toggle-doccia"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              checked={presenza_doccia}
              onChange={e => setPresenzaDoccia(e.target.checked)}
            />
            <label htmlFor="toggle-doccia" className="cursor-pointer">
              <div className="text-sm font-medium text-gray-800">Presenza Zona Doccia</div>
              <div className="text-xs text-gray-500">Abilita la gestione della stratigrafia per la zona doccia</div>
            </label>
          </div>

          {/* Sub-sezione doccia */}
          {presenza_doccia && (
            <div className="border border-blue-100 rounded-lg bg-blue-50 p-4 space-y-5">
              <h3 className="text-sm font-semibold text-blue-800">Zona Doccia — dati obbligatori</h3>

              {/* Misure */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Misure area doccia</p>
                <div className="flex flex-wrap gap-4">
                  <NumField label="Larghezza" value={doccia_larghezza} onChange={setDocciaLarghezza} unit="m" />
                  <NumField label="Lunghezza" value={doccia_lunghezza} onChange={setDocciaLunghezza} unit="m" />
                  <NumField label="Altezza rivestimento" value={doccia_altezza_rivestimento} onChange={setDocciaAltezza} unit="m" />
                </div>
                {doccia_larghezza > 0 && doccia_lunghezza > 0 && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    Area calc.: pavimento {mqDocciaPav.toFixed(2)} m² · pareti {mqDocciaPareti.toFixed(2)} m²
                  </p>
                )}
              </div>

              {/* Tipo piatto */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Tipo piatto doccia <span className="text-red-500">*</span>
                </p>
                <div className="flex gap-3">
                  {(['NUOVO', 'ESISTENTE'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDocciaPiattoType(t)}
                      className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        doccia_piatto_type === t
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t === 'NUOVO' ? 'Creazione piatto doccia' : 'Piatto doccia esistente'}
                    </button>
                  ))}
                </div>
                {doccia_piatto_type === 'NUOVO' && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    Verrà inclusa la stratigrafia completa per realizzazione piatto (massetto epossidico + fondi + guaina).
                  </p>
                )}
                {doccia_piatto_type === 'ESISTENTE' && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    Verranno incluse le lavorazioni di raccordo, sigillatura e impermeabilizzazione su piatto esistente.
                  </p>
                )}
              </div>

              {/* Raccordi idraulici */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Raccordi idraulici</p>
                <div className="flex flex-wrap gap-4">
                  <NumField
                    label="Standard (BBpass)"
                    value={doccia_raccordi_standard}
                    onChange={setDocciaRaccordiStandard}
                    unit="pz"
                    step={1}
                  />
                  <NumField
                    label="Grandi / scarichi (BBdrain)"
                    value={doccia_raccordi_grandi}
                    onChange={setDocciaRaccordiGrandi}
                    unit="pz"
                    step={1}
                  />
                </div>
              </div>

              {/* Angoli */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Angoli</p>
                <div className="flex flex-wrap gap-4">
                  <NumField
                    label="BBcorner interni"
                    value={doccia_bbcorner_in}
                    onChange={setDocciaBbcornerIn}
                    unit="pz"
                    step={1}
                  />
                  <NumField
                    label="BBcorner esterni"
                    value={doccia_bbcorner_out}
                    onChange={setDocciaBbcornerOut}
                    unit="pz"
                    step={1}
                  />
                </div>
              </div>

              {/* BBtape + Norphen */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Sigillature</p>
                <div className="flex flex-wrap gap-4">
                  <NumField
                    label="BBtape"
                    value={doccia_bbtape_ml}
                    onChange={setDocciaBbtapeMl}
                    unit="ml"
                    step={0.5}
                  />
                  <NumField
                    label="Sigillature Norphen (perimetrali + scassi)"
                    value={doccia_norphen_ml}
                    onChange={setDocciaNorphenMl}
                    unit="ml"
                    step={0.5}
                  />
                </div>
              </div>

              {/* Nicchie */}
              <div className="flex items-center gap-2">
                <input
                  id="toggle-nicchie"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  checked={doccia_nicchie}
                  onChange={e => setDoccianicchie(e.target.checked)}
                />
                <label htmlFor="toggle-nicchie" className="text-sm text-gray-700">
                  Presenza nicchie / elementi integrati
                </label>
              </div>
            </div>
          )}

          {/* Toggle Mercato Tedesco */}
          <div className="flex items-start gap-3 pt-1 border-t border-gray-100">
            <input
              id="toggle-din"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              checked={mercato_tedesco}
              onChange={e => setMercatoTedesco(e.target.checked)}
            />
            <label htmlFor="toggle-din" className="cursor-pointer">
              <div className="text-sm font-medium text-gray-800">Mercato Tedesco (DIN 18534)</div>
              <div className="text-xs text-gray-500">
                {presenza_doccia
                  ? 'Attivo insieme alla zona doccia: applica automaticamente le logiche DIN 18534.'
                  : 'La logica DIN si attiva automaticamente se combinata con la zona doccia.'}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
