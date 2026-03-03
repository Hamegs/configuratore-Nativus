import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { ROOM_TYPES } from '../../types/project';
import type { AmbienteId } from '../../types/enums';

// ─── Shared step layout helpers ───────────────────────────────────────────────

interface StepHeaderProps { title: string; subtitle?: string }
export function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <div className="pb-6">
      <p className="surtitle mb-2">Configurazione</p>
      <h2
        style={{
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: '#171e29',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            marginTop: 8,
            fontSize: 14,
            color: '#8b8f94',
            letterSpacing: '0.02em',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface StepNavProps {
  canContinue?: boolean;
  canGoNext?: boolean;
  onNext: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  showPrev?: boolean;
  canGoBack?: boolean;
  isLastStep?: boolean;
}
export function StepNavigation({
  canContinue, canGoNext,
  onNext, onPrev,
  nextLabel = 'Avanti →',
  showPrev = true, canGoBack,
}: StepNavProps) {
  const { prevStep } = useWizardStore();
  const handlePrev = onPrev ?? prevStep;
  const canNext    = canGoNext ?? canContinue ?? true;
  const showBack   = canGoBack ?? showPrev;

  return (
    <div className="flex items-center justify-between pt-8 mt-8" style={{ borderTop: '1px solid #d8d9d6' }}>
      {showBack
        ? (
          <button type="button" className="btn-secondary" onClick={handlePrev}>
            ← Indietro
          </button>
        )
        : <span />}
      <button
        type="button"
        className="btn-primary"
        disabled={!canNext}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </div>
  );
}

// ─── Numeric input helper ─────────────────────────────────────────────────────

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  step?: number;
  disabled?: boolean;
}
export function NumField({ label, value, onChange, unit = '', min = 0, step = 0.5, disabled }: NumFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#8b8f94',
        }}
      >
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={min}
          step={step}
          disabled={disabled}
          style={{
            height: 48,
            width: 140,
            border: '1px solid #d8d9d6',
            background: '#ffffff',
            padding: '0 12px',
            fontSize: 16,
            fontWeight: 500,
            color: '#171e29',
            outline: 'none',
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'auto',
          }}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && (
          <span style={{ fontSize: 13, color: '#8b8f94', letterSpacing: '0.04em' }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

// ─── StepAmbiente ─────────────────────────────────────────────────────────────

interface StepAmbienteProps {
  /** Nasconde il selettore tipo-ambiente (usato in RoomWizardPage dove il tipo è già fissato) */
  lockedAmbiente?: boolean;
}

export function StepAmbiente({ lockedAmbiente = false }: StepAmbienteProps) {
  const {
    ambiente, room_type_display,
    mq_pavimento, mq_pareti,
    superfici_confirmed,
    presenza_doccia, mercato_tedesco,
    doccia_larghezza, doccia_lunghezza, doccia_altezza_rivestimento,
    doccia_piatto_type,
    doccia_raccordi_standard, doccia_raccordi_grandi,
    doccia_bbcorner_in, doccia_bbcorner_out,
    doccia_bbtape_ml, doccia_norphen_ml,
    doccia_n_raccordi,
    setAmbiente, setRoomTypeDisplay,
    setMqPavimento, setMqPareti,
    setSuperficiConfirmed,
    setPresenzaDoccia, setMercatoTedesco,
    setDocciaLarghezza, setDocciaLunghezza, setDocciaAltezza,
    setDocciaPiattoType,
    setDocciaRaccordiStandard, setDocciaRaccordiGrandi,
    setDocciaBbcornerIn, setDocciaBbcornerOut,
    setDocciaBbtapeMl, setDocciaNorphenMl,
    setDocciaRaccordi,
    nextStep,
  } = useWizardStore();

  // Guard: in locked mode, wait until ambiente is hydrated (avoids stale-state flash)
  if (lockedAmbiente && !ambiente) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isBag = ambiente === 'BAG';

  // Deriva il label leggibile dall'ambiente selezionato
  const displayLabel =
    ROOM_TYPES.find(t => t.id === room_type_display)?.label ??
    (ambiente === 'BAG' ? 'Bagno' : ambiente === 'ORD' ? 'Locale' : '—');

  const docciaValid = !presenza_doccia || (
    !!doccia_piatto_type &&
    (doccia_piatto_type === 'ESISTENTE' || (
      doccia_larghezza > 0 &&
      doccia_lunghezza > 0 &&
      doccia_altezza_rivestimento > 0
    ))
  );

  const canConfirm =
    !!ambiente &&
    (mq_pavimento > 0 || mq_pareti > 0) &&
    docciaValid;

  // Quando l'utente seleziona un tipo ambiente
  function handleSelectRoomType(typeId: string, envDefault: string) {
    setRoomTypeDisplay(typeId);
    setAmbiente(envDefault as AmbienteId);
  }

  function handleConfirm() {
    setSuperficiConfirmed(true);
    nextStep();
  }

  // ── Stato confermato: mostra riepilogo locked ─────────────────────────────
  if (superfici_confirmed) {
    return (
      <div className="space-y-5">
        <div style={{ border: '1px solid #d8d9d6', background: '#ffffff', padding: '20px 24px' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="surtitle mb-2" style={{ color: '#897e5e' }}>Superfici confermate</p>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#171e29', marginBottom: 10 }}>{displayLabel}</div>
              <div className="flex flex-wrap gap-5" style={{ fontSize: 13, color: '#445164' }}>
                {mq_pavimento > 0 && (
                  <span>Pavimento: <strong style={{ color: '#171e29' }}>{mq_pavimento} m²</strong></span>
                )}
                {mq_pareti > 0 && (
                  <span>Pareti: <strong style={{ color: '#171e29' }}>{mq_pareti} m²</strong></span>
                )}
                {presenza_doccia && (
                  <span style={{ color: '#445164' }}>
                    Doccia: {doccia_piatto_type === 'NUOVO' ? 'Piatto da realizzare' : 'Piatto esistente'}
                    {doccia_piatto_type === 'NUOVO' && doccia_larghezza > 0 && doccia_lunghezza > 0 &&
                      ` (${Math.round(doccia_larghezza * 1000)}×${Math.round(doccia_lunghezza * 1000)} mm)`}
                  </span>
                )}
                {mercato_tedesco && presenza_doccia && (
                  <span className="surtitle" style={{ color: '#897e5e' }}>DIN 18534 attivo</span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: '6px 16px', whiteSpace: 'nowrap', minHeight: 36 }}
              onClick={() => setSuperficiConfirmed(false)}
            >
              Modifica
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={nextStep}>
            Avanti →
          </button>
        </div>
      </div>
    );
  }

  // ── Stato non confermato: form inserimento ────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Card 1 — Tipo ambiente (nascosta se locked) */}
      {!lockedAmbiente && (
        <div>
          <p className="surtitle mb-4">Tipo di ambiente</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROOM_TYPES.filter(t => t.id !== 'ALTRO').map(rt => {
              const isSelected = room_type_display === rt.id;
              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => handleSelectRoomType(rt.id, rt.env_default)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '20px 18px',
                    border: isSelected ? '1px solid #171e29' : '1px solid #d8d9d6',
                    background: isSelected ? '#171e29' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 22, marginBottom: 8, display: 'block' }}>{rt.icon}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      color: isSelected ? '#ffffff' : '#171e29',
                    }}
                  >
                    {rt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Intestazione locked-mode */}
      {lockedAmbiente && ambiente && (
        <div className="flex items-center gap-3 px-1">
          <span className="text-2xl">
            {ROOM_TYPES.find(t => t.id === room_type_display)?.icon ?? '🏠'}
          </span>
          <div>
            <div className="surtitle">Ambiente</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#171e29' }}>{displayLabel}</div>
          </div>
        </div>
      )}

      {/* Card 2 — Superfici */}
      {ambiente && (
        <div style={{ border: '1px solid #d8d9d6', background: '#ffffff', padding: '24px' }}>
          <p className="surtitle mb-4">Superfici da trattare</p>
          {isBag && presenza_doccia && (
            <p className="alert-info text-xs mb-5">
              Le metrature inserite sono comprensive dell'area doccia.
              Non aggiungere mq separati per la doccia.
            </p>
          )}
          <div className="flex flex-wrap gap-8 mt-1">
            <NumField
              label="Pavimento"
              value={mq_pavimento}
              onChange={setMqPavimento}
              unit="m²"
            />
            <NumField
              label="Pareti"
              value={mq_pareti}
              onChange={setMqPareti}
              unit="m²"
            />
          </div>
          {mq_pavimento === 0 && mq_pareti === 0 && (
            <p className="alert-warn text-xs mt-4">
              Inserisci almeno una metratura.
            </p>
          )}
        </div>
      )}

      {/* Card 3 — Opzioni Bagno (solo se BAG) */}
      {isBag && (
        <div style={{ border: '1px solid #d8d9d6', background: '#ffffff', padding: '24px' }} className="space-y-5">
          <p className="surtitle">Bagno — opzioni speciali</p>

          {/* Toggle doccia */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              style={{ accentColor: '#171e29' }}
              checked={presenza_doccia}
              onChange={e => setPresenzaDoccia(e.target.checked)}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#171e29' }}>Presenza Zona Doccia</div>
              <div style={{ fontSize: 12, color: '#8b8f94', marginTop: 2 }}>
                Abilita la stratigrafia specifica per la doccia.
                I mq inseriti sopra includono già la zona doccia.
              </div>
            </div>
          </label>

          {/* Sub-sezione doccia */}
          {presenza_doccia && (
            <div style={{ border: '1px solid #d8d9d6', background: '#f5f5f3', padding: '20px' }} className="space-y-5">
              <p className="surtitle" style={{ color: '#445164' }}>Zona Doccia — dati obbligatori</p>

              {/* Tipo piatto */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8b8f94', marginBottom: 8 }}>
                  Tipo piatto doccia <span style={{ color: '#ef4444' }}>*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['NUOVO', 'ESISTENTE'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDocciaPiattoType(t)}
                      style={{
                        padding: '10px 20px',
                        border: doccia_piatto_type === t ? '1px solid #171e29' : '1px solid #d8d9d6',
                        background: doccia_piatto_type === t ? '#171e29' : '#ffffff',
                        color: doccia_piatto_type === t ? '#ffffff' : '#445164',
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {t === 'NUOVO' ? 'Piatto da realizzare' : 'Piatto esistente'}
                    </button>
                  ))}
                </div>
                {doccia_piatto_type === 'NUOVO' && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    Stratigrafia completa inclusa: massetto epossidico + fondi + impermeabilizzazione.
                  </p>
                )}
                {doccia_piatto_type === 'ESISTENTE' && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    Incluse lavorazioni di raccordo, sigillatura e impermeabilizzazione su piatto esistente.
                  </p>
                )}
              </div>

              {/* Misure — solo piatto NUOVO */}
              {doccia_piatto_type === 'NUOVO' && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Misure area doccia <span className="text-red-500">*</span>
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <NumField
                      label="Larghezza"
                      value={Math.round(doccia_larghezza * 1000)}
                      onChange={(v) => setDocciaLarghezza(v / 1000)}
                      unit="mm"
                      step={10}
                    />
                    <NumField
                      label="Lunghezza"
                      value={Math.round(doccia_lunghezza * 1000)}
                      onChange={(v) => setDocciaLunghezza(v / 1000)}
                      unit="mm"
                      step={10}
                    />
                    <NumField
                      label="H rivestimento"
                      value={Math.round(doccia_altezza_rivestimento * 1000)}
                      onChange={(v) => setDocciaAltezza(v / 1000)}
                      unit="mm"
                      step={10}
                    />
                  </div>
                  {doccia_larghezza > 0 && doccia_lunghezza > 0 && (
                    <p className="text-xs text-blue-500 mt-1.5">
                      Pavimento doccia: {(doccia_larghezza * doccia_lunghezza).toFixed(2)} m² ·
                      Pareti doccia: {(2 * (doccia_larghezza + doccia_lunghezza) * doccia_altezza_rivestimento).toFixed(2)} m²
                      <span className="ml-1 text-gray-400">(compresi nei mq totali)</span>
                    </p>
                  )}
                </div>
              )}

              {/* Raccordi — logica diversa per DIN e non-DIN */}
              {!mercato_tedesco && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Raccordi idraulici</p>
                  <p className="text-xs text-gray-400 mb-2">
                    Necessari per calcolo sigillature Norphen e MS Pro Sealer.
                  </p>
                  <NumField
                    label="Numero raccordi"
                    value={doccia_n_raccordi}
                    onChange={setDocciaRaccordi}
                    unit="pz"
                    step={1}
                  />
                </div>
              )}

              {/* Campi DIN — solo mercato tedesco */}
              {mercato_tedesco && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                    Dati DIN 18534 obbligatori
                  </p>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Raccordi idraulici</p>
                    <div className="flex flex-wrap gap-4">
                      <NumField label="Standard ∅≤30mm (BBpass)" value={doccia_raccordi_standard} onChange={setDocciaRaccordiStandard} unit="pz" step={1} />
                      <NumField label="Grandi/scarichi ∅>30mm (BBdrain)" value={doccia_raccordi_grandi} onChange={setDocciaRaccordiGrandi} unit="pz" step={1} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Angoli</p>
                    <div className="flex flex-wrap gap-4">
                      <NumField label="BBcorner IN (angoli interni)" value={doccia_bbcorner_in} onChange={setDocciaBbcornerIn} unit="pz" step={1} />
                      <NumField label="BBcorner OUT (angoli esterni)" value={doccia_bbcorner_out} onChange={setDocciaBbcornerOut} unit="pz" step={1} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Sigillature</p>
                    <div className="flex flex-wrap gap-4">
                      <NumField label="BBtape (ml lineari)" value={doccia_bbtape_ml} onChange={setDocciaBbtapeMl} unit="ml" step={0.5} />
                      <div>
                        <NumField label="Norphen Fondo Igro (ml lineari)" value={doccia_norphen_ml} onChange={setDocciaNorphenMl} unit="ml" step={0.1} />
                        <p className="text-xs text-gray-400 mt-0.5">5 g/ml su fascia 5 cm</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toggle DIN — solo con doccia attiva */}
          <div className="pt-1 border-t border-gray-100">
            <label className={`flex items-start gap-3 ${!presenza_doccia ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={!presenza_doccia}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                checked={mercato_tedesco && presenza_doccia}
                onChange={e => setMercatoTedesco(e.target.checked)}
              />
              <div>
                <div className="text-sm font-medium text-gray-800">Mercato Tedesco (DIN 18534)</div>
                <div className="text-xs text-gray-500">
                  {presenza_doccia
                    ? 'Attivo con zona doccia: applica automaticamente le logiche DIN 18534.'
                    : 'Disponibile solo in presenza di zona doccia.'}
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Gate: Conferma Superfici */}
      {ambiente && (
        <div className="flex flex-col items-end gap-2">
          {!canConfirm && (
            <p className="text-xs text-amber-600 text-right">
              {mq_pavimento === 0 && mq_pareti === 0
                ? 'Inserisci almeno una metratura (pavimento o pareti).'
                : isBag && presenza_doccia && !doccia_piatto_type
                  ? 'Scegli il tipo di piatto doccia per proseguire.'
                  : isBag && presenza_doccia && (doccia_larghezza === 0 || doccia_lunghezza === 0)
                    ? 'Inserisci le misure della zona doccia (larghezza e lunghezza).'
                    : ''}
            </p>
          )}
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="btn-primary"
          >
            Conferma Superfici →
          </button>
        </div>
      )}

    </div>
  );
}
