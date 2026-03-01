import React from 'react';
import type { CartResult } from '../../engine/cart-calculator';
import { formatEur } from '../../utils/formatters';

interface VistaRivenditoreProps {
  result: CartResult;
}

const SECTION_LABELS: Record<string, string> = {
  fondo: 'Preparazione fondi',
  texture: 'Texture',
  protettivi: 'Protettivi',
  din: 'Accessori DIN 18534',
  speciale: 'Righe speciali',
};

export function VistaRivenditore({ result }: VistaRivenditoreProps) {
  const { summary } = result;
  const sections = ['fondo', 'texture', 'protettivi', 'din', 'speciale'] as const;

  return (
    <div className="space-y-6">
      {/* Hard notes */}
      {summary.hard_notes.length > 0 && (
        <div className="space-y-2">
          {summary.hard_notes.map((note, i) => (
            <div key={i} className={note.severity === 'hard' ? 'alert-hard' : 'alert-info'}>
              {note.text}
            </div>
          ))}
        </div>
      )}

      {/* Cart per section */}
      {sections.map(section => {
        const lines = summary.lines.filter(l => l.section === section);
        if (lines.length === 0) return null;
        return (
          <section key={section} className="card overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-700">{SECTION_LABELS[section]}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left">SKU / Descrizione</th>
                  <th className="px-4 py-2 text-right">Qtà</th>
                  <th className="px-4 py-2 text-right">Prezzo unit.</th>
                  <th className="px-4 py-2 text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs text-gray-500">{line.sku_id}</div>
                      <div className="text-gray-800">{line.descrizione}</div>
                      {line.note && <div className="text-xs text-amber-600">{line.note}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">{line.qty}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{formatEur(line.prezzo_unitario)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatEur(line.totale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      {/* Fees */}
      {summary.fees.length > 0 && (
        <section className="card overflow-hidden">
          <div className="border-b border-gray-100 bg-amber-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-amber-800">Voci aggiuntive</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {summary.fees.map((fee, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{fee.description}</td>
                  <td className="px-4 py-2.5 text-right">{fee.qty}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatEur(fee.amount * fee.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Totale */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <div>Prodotti: {formatEur(summary.total_lines_eur)}</div>
            {summary.total_fees_eur > 0 && <div>Voci aggiuntive: {formatEur(summary.total_fees_eur)}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Totale listino</div>
            <div className="text-2xl font-bold text-brand-700">{formatEur(summary.total_eur)}</div>
          </div>
        </div>
        <div className="mt-2 text-right text-xs text-gray-400">
          Generato il {new Date(summary.generated_at).toLocaleString('it-IT')}
        </div>
      </div>
    </div>
  );
}
