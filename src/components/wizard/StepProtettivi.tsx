import React from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { BlockAlerts } from '../shared/BlockAlerts';
import { StepHeader, StepNavigation } from './StepAmbiente';
import type { ProtectionSystem } from '../../types/enums';
import type { ProtettivoSelection } from '../../types/protettivi';

const FINITURA_OPTIONS: Array<{ value: string; label: string; systems: ProtectionSystem[]; lines: string[] }> = [
  { value: 'OPACO', label: 'Opaco', systems: ['H2O', 'S'], lines: ['NATURAL', 'SENSE', 'DEKORA', 'LAMINE', 'CORLITE', 'MATERIAL'] },
  { value: 'LUCIDO', label: 'Lucido', systems: ['H2O', 'S'], lines: ['NATURAL', 'SENSE', 'DEKORA', 'LAMINE'] },
  { value: 'CERA_LUCIDA', label: 'Cera Lucida (SEAL WAX)', systems: ['H2O'], lines: ['CORLITE'] },
  { value: 'PROTEGGO_COLOR_OPACO', label: 'PROTEGGO Color Opaco H2O (colorato)', systems: ['H2O'], lines: ['NATURAL', 'SENSE', 'DEKORA'] },
];

export function StepProtettivi() {
  const { protettivo, setProtettivo, texture_line, active_blocks, nextStep, prevStep } = useWizardStore();
  const sel = protettivo ?? { system: 'H2O' as ProtectionSystem, finitura: 'OPACO', uso_superficie: 'PAVIMENTO', opaco_colorato: false };

  function update(patch: Partial<ProtettivoSelection>) {
    setProtettivo({ ...sel, ...patch } as ProtettivoSelection);
  }

  const isMaterial = texture_line === 'MATERIAL';
  const availableSystems: ProtectionSystem[] = isMaterial ? ['H2O'] : ['H2O', 'S'];
  const availableFinitura = FINITURA_OPTIONS.filter(f =>
    f.systems.includes(sel.system) && f.lines.includes(texture_line ?? ''),
  );

  const isValid = !!protettivo && !!protettivo.system && !!protettivo.finitura && active_blocks.length === 0;

  return (
    <div className="space-y-8">
      <StepHeader title="Protettivi" subtitle="Scegli il sistema di finitura e il tipo di protettivo." />
      <BlockAlerts blocks={active_blocks} />

      {/* Sistema */}
      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Sistema *</h2>
        {isMaterial && <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">MATERIAL: solo sistema base acqua (H₂O).</p>}
        <div className="flex gap-4">
          {availableSystems.map(s => (
            <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-5 py-3 text-sm font-medium transition-colors ${sel.system === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-300 text-gray-700'}`}>
              <input type="radio" name="system" checked={sel.system === s} onChange={() => update({ system: s, finitura: 'OPACO' })} className="accent-brand-600" />
              {s === 'H2O' ? 'Base acqua (H₂O)' : 'Solvente (S)'}
            </label>
          ))}
        </div>
      </section>

      {/* Finitura */}
      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Finitura *</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availableFinitura.map(f => (
            <label key={f.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${sel.finitura === f.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'}`}>
              <input type="radio" name="finitura" checked={sel.finitura === f.value} onChange={() => update({ finitura: f.value as ProtettivoSelection['finitura'], opaco_colorato: false })} className="accent-brand-600" />
              <span className="text-sm font-medium text-gray-800">{f.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Colore opaco S */}
      {sel.system === 'S' && sel.finitura === 'OPACO' && (
        <section className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Opaco S colorato?</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={sel.opaco_colorato} onChange={e => update({ opaco_colorato: e.target.checked })} className="accent-brand-600" />
            Sì, con premix colore (1 premix per confezione Opaco S)
          </label>
        </section>
      )}

      {/* Trasparente finale dopo Color Opaco H2O */}
      {sel.finitura === 'PROTEGGO_COLOR_OPACO' && (
        <section className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Mano trasparente finale *</h2>
          <select value={sel.trasparente_finale ?? ''} onChange={e => update({ trasparente_finale: e.target.value as ProtettivoSelection['trasparente_finale'] })} className="select-field">
            <option value="">— Seleziona —</option>
            <option value="OPACO_H2O">Opaco H2O</option>
            <option value="LUCIDO_H2O">Lucido H2O</option>
          </select>
        </section>
      )}

      {/* Uso superficie */}
      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-800">Tipo di utilizzo</h2>
        <select value={sel.uso_superficie} onChange={e => update({ uso_superficie: e.target.value as ProtettivoSelection['uso_superficie'] })} className="select-field">
          <option value="PAVIMENTO">Pavimento</option>
          <option value="BAGNO_DOCCIA">Bagno / Doccia</option>
          <option value="PARETE_FUORI_BAGNO">Parete fuori bagno (riduzione mani possibile)</option>
        </select>
      </section>

      <StepNavigation canContinue={isValid} onNext={nextStep} onPrev={prevStep} />
    </div>
  );
}
