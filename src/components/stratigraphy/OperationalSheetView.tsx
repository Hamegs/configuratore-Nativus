import React from 'react';
import { Printer } from 'lucide-react';
import type { CartResult } from '../../engine/cart-calculator';
import type { CartLine } from '../../types/cart';
import { useAdminStore } from '../../store/admin-store';
import type { OperationalAudience, OperationalField } from '../../types/cms';

interface Props {
  audience: OperationalAudience;
  cartResult: CartResult | null;
  cartLines: CartLine[];
  projectName?: string;
  roomName?: string;
}

const AUDIENCE_LABEL: Record<OperationalAudience, string> = {
  APPLICATORE: 'Applicatore',
  DISTRIBUTORE: 'Distributore',
  PROGETTISTA: 'Progettista',
};

const FIELD_LABELS: Record<OperationalField, string> = {
  material: 'Materiale',
  consumption: 'Consumo',
  application_times: 'Tempi',
  tools: 'Strumenti',
  cleaning: 'Pulizia',
  technical_notes: 'Note tecniche',
  pricing: 'Prezzo',
};

const DEFAULT_VISIBLE: Record<OperationalAudience, OperationalField[]> = {
  APPLICATORE: ['material', 'consumption', 'application_times', 'tools', 'cleaning', 'technical_notes'],
  DISTRIBUTORE: ['material', 'consumption', 'pricing'],
  PROGETTISTA: ['material', 'consumption', 'technical_notes'],
};

export function OperationalSheetView({ audience, cartResult, cartLines, projectName, roomName }: Props) {
  const { cms } = useAdminStore(s => ({ cms: s.cms }));

  const template = cms.operationalSheetTemplates.find(t => t.audience === audience);
  const visibleFields: OperationalField[] = template?.visible_fields ?? DEFAULT_VISIBLE[audience];

  const appStepsMap = new Map(cms.applicationSteps.map(s => [s.product_id, s]));
  const toolsMap = new Map(cms.tools.map(t => [t.id, t]));

  const lines = cartLines.length ? cartLines : (cartResult?.summary?.lines ?? []);

  const rows = lines.map(line => {
    const pid = line.product_id ?? line.sku_id;
    const step = pid ? appStepsMap.get(pid) : undefined;
    const toolNames = (step?.tool_ids ?? []).map(tid => toolsMap.get(tid)?.name ?? tid).join(', ');
    return {
      product_id: pid,
      material: step?.step_name ?? line.descrizione ?? pid,
      consumption: step?.consumption ?? (line.qty != null && line.pack_unit ? `${line.qty} ${line.pack_unit}` : ''),
      application_times: [step?.drying_time, step?.overcoating_time].filter(Boolean).join(' / '),
      tools: toolNames,
      cleaning: step?.cleaning_method ?? '',
      technical_notes: step?.technical_notes ?? line.note ?? '',
      pricing: line.totale != null ? line.totale.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '',
    };
  });

  if (!rows.length) {
    return <p style={{ fontSize: 12, color: '#8c9aaa' }}>Nessun materiale in questa configurazione.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8c9aaa', margin: 0 }}>
            Scheda operativa — {AUDIENCE_LABEL[audience]}
          </p>
          {projectName && (
            <h2 style={{ fontSize: 20, fontWeight: 300, color: '#171e29', margin: '6px 0 2px', letterSpacing: '0.03em' }}>
              {projectName}
            </h2>
          )}
          {roomName && (
            <p style={{ fontSize: 13, color: '#445164', margin: 0 }}>{roomName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: '#171e29', color: '#fff',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}
        >
          <Printer size={13} /> Stampa / PDF
        </button>
      </div>

      <div className="print-only-block" style={{}}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #171e29' }}>
              {visibleFields.map(f => (
                <th key={f} style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 700, color: '#171e29', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {FIELD_LABELS[f]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e8eae6', background: idx % 2 === 0 ? '#fff' : '#fafaf8' }}>
                {visibleFields.map(f => (
                  <td key={f} style={{ padding: '7px 10px', color: f === 'material' ? '#171e29' : '#445164', fontWeight: f === 'material' ? 600 : 400 }}>
                    {row[f] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          body > *:not(.print-root) { display: none !important; }
          .print-root { display: block !important; }
        }
      `}</style>
    </div>
  );
}
