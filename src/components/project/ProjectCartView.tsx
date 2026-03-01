import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/project-store';
import { loadDataStore } from '../../utils/data-loader';
import type { PackagingStrategy, ProjectCartRow } from '../../types/project';
import { computePackagingOptions } from '../../engine/packaging-optimizer';

const STRATEGIES: { id: PackagingStrategy; label: string; desc: string }[] = [
  { id: 'MINIMO_SFRIDO',      label: 'Minimo sfrido',       desc: 'Minimizza il materiale in eccesso' },
  { id: 'ECONOMICO',          label: 'Economico',            desc: 'Minimizza il costo totale' },
  { id: 'CONFEZIONI_GRANDI',  label: 'Confezioni grandi',   desc: 'Usa sempre la pezzatura più grande' },
  { id: 'CONFEZIONI_PICCOLE', label: 'Confezioni piccole',  desc: 'Usa sempre la pezzatura più piccola' },
];

const SECTION_LABELS: Record<string, string> = {
  fondo: 'Fondi / Preparazione',
  texture: 'Texture',
  protettivi: 'Protettivi',
  din: 'Accessori DIN',
  speciale: 'Speciali / Manuali',
};

function SectionBadge({ section }: { section: string }) {
  const colors: Record<string, string> = {
    fondo: 'bg-indigo-100 text-indigo-700',
    texture: 'bg-purple-100 text-purple-700',
    protettivi: 'bg-cyan-100 text-cyan-700',
    din: 'bg-orange-100 text-orange-700',
    speciale: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[section] ?? 'bg-gray-100 text-gray-600'}`}>
      {SECTION_LABELS[section] ?? section}
    </span>
  );
}

export function ProjectCartView() {
  const navigate = useNavigate();
  const { rooms, cart, strategy, setStrategy, overrideCartRow, excludeCartRow, restoreCartRow, removeCartRow, addManualRow, persist } = useProjectStore();
  const store = loadDataStore();

  const [overrideRowId, setOverrideRowId] = useState<string | null>(null);
  const [overrideSku, setOverrideSku] = useState('');
  const [overrideQty, setOverrideQty] = useState(1);
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualSearch, setManualSearch] = useState('');

  const configuredRooms = rooms.filter(r => r.is_configured);
  const activeRows = cart.filter(r => r.status === 'active');
  const excludedRows = cart.filter(r => r.status === 'excluded');
  const totalActive = activeRows.reduce((a, r) => a + r.totale, 0);

  const allSkuIds = useMemo(() => store.packagingSku.map(p => p.sku_id).sort(), [store]);
  const filteredSkus = useMemo(() => {
    const q = manualSearch.toLowerCase();
    return q ? allSkuIds.filter(s => s.toLowerCase().includes(q)) : allSkuIds;
  }, [allSkuIds, manualSearch]);

  function handleStrategyChange(s: PackagingStrategy) {
    setStrategy(s, store);
  }

  function openOverride(row: ProjectCartRow) {
    setOverrideRowId(row.row_id);
    setOverrideSku(row.sku_id);
    setOverrideQty(row.qty_packs);
  }

  function confirmOverride() {
    if (overrideRowId) {
      overrideCartRow(overrideRowId, overrideSku, overrideQty, store);
      setOverrideRowId(null);
    }
  }

  function handleAddManual() {
    if (!manualSku) return;
    addManualRow(manualSku, manualQty, store);
    setManualSku('');
    setManualQty(1);
    setManualSearch('');
    setShowAddManual(false);
  }

  // Get all SKU options for override
  const overrideRow = overrideRowId ? cart.find(r => r.row_id === overrideRowId) : null;
  const overrideOptions = useMemo(() => {
    if (!overrideRow?.product_id) return [];
    const skus = store.packagingSku.filter(p => p.product_id === overrideRow.product_id);
    if (skus.length === 0) return [];
    // We need qty_raw — estimate from current packs × pack_size
    const qty_raw_est = overrideRow.qty_packs * overrideRow.pack_size;
    return computePackagingOptions(qty_raw_est, skus, store.listino);
  }, [overrideRow, store]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carrello progetto</h1>
          <p className="text-sm text-gray-500 mt-1">
            {configuredRooms.length} {configuredRooms.length === 1 ? 'ambiente configurato' : 'ambienti configurati'} · {activeRows.length} righe attive
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={() => navigate('/progetto')}>
          ← Torna agli ambienti
        </button>
      </div>

      {/* Strategia packaging */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Strategia di packaging</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleStrategyChange(s.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${strategy === s.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`text-xs font-semibold ${strategy === s.id ? 'text-brand-700' : 'text-gray-700'}`}>{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Righe carrello attive */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Righe ordine</h2>
          <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddManual(true)}>
            + Aggiungi articolo manuale
          </button>
        </div>

        {showAddManual && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Aggiungi articolo da listino</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="label-text">Cerca SKU</label>
                <input type="search" className="input-field text-xs" placeholder="Cerca..." value={manualSearch} onChange={e => setManualSearch(e.target.value)} />
                <select className="input-field text-xs mt-1" size={4} value={manualSku} onChange={e => setManualSku(e.target.value)}>
                  <option value="">— seleziona —</option>
                  {filteredSkus.slice(0, 50).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Quantità (confezioni)</label>
                <input type="number" min={1} className="input-field text-xs w-24" value={manualQty} onChange={e => setManualQty(parseInt(e.target.value) || 1)} />
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary text-xs" onClick={handleAddManual} disabled={!manualSku}>Aggiungi</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddManual(false)}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['', 'SKU', 'Descrizione', 'Sezione', 'Pezzi', 'Pezzatura', '€/conf.', 'Totale €', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.map(row => (
                <tr key={row.row_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-1.5">
                    {row.source === 'manual' && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">M</span>}
                    {row.is_override && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-1">*</span>}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-gray-700 whitespace-nowrap">{row.sku_id}</td>
                  <td className="px-3 py-1.5 text-gray-600 max-w-xs truncate">{row.descrizione}</td>
                  <td className="px-3 py-1.5"><SectionBadge section={row.section} /></td>
                  <td className="px-3 py-1.5 text-right font-semibold">{row.qty_packs}</td>
                  <td className="px-3 py-1.5 text-gray-500">{row.pack_size} {row.pack_unit}</td>
                  <td className="px-3 py-1.5 text-right">{row.prezzo_unitario.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{row.totale.toFixed(2)}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap space-x-1">
                    <button type="button" className="text-brand-600 hover:underline" onClick={() => openOverride(row)}>Modifica</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="text-amber-600 hover:underline" onClick={() => excludeCartRow(row.row_id)}>Escludi</button>
                    {row.source === 'manual' && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button type="button" className="text-red-500 hover:underline" onClick={() => removeCartRow(row.row_id)}>Rimuovi</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {activeRows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">Nessuna riga attiva.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={7} className="px-3 py-2 text-right font-semibold text-gray-700">Totale</td>
                <td className="px-3 py-2 text-right font-bold text-brand-700 text-sm">{totalActive.toFixed(2)} €</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Righe escluse */}
      {excludedRows.length > 0 && (
        <div className="card overflow-hidden opacity-60">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Righe escluse ({excludedRows.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {excludedRows.map(row => (
                  <tr key={row.row_id} className="border-b border-gray-50">
                    <td className="px-3 py-1.5 font-mono text-gray-400 line-through">{row.sku_id}</td>
                    <td className="px-3 py-1.5 text-gray-400 line-through">{row.descrizione}</td>
                    <td className="px-3 py-1.5 text-right text-gray-400 line-through">{row.qty_packs} × {row.pack_size} {row.pack_unit}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <button type="button" className="text-brand-600 hover:underline" onClick={() => restoreCartRow(row.row_id)}>Ripristina</button>
                      {row.source === 'manual' && (
                        <><span className="text-gray-300 mx-1">|</span>
                          <button type="button" className="text-red-500 hover:underline" onClick={() => removeCartRow(row.row_id)}>Rimuovi</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Override modal */}
      {overrideRowId && overrideRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full space-y-4">
            <h3 className="font-bold text-gray-900">Modifica riga: <span className="font-mono text-brand-700">{overrideRow.product_id}</span></h3>
            <div className="space-y-3">
              <div>
                <label className="label-text">SKU / Pezzatura</label>
                <select className="input-field" value={overrideSku} onChange={e => setOverrideSku(e.target.value)}>
                  {overrideOptions.length > 0 ? (
                    overrideOptions.map(o => (
                      <option key={o.sku_id} value={o.sku_id}>
                        {o.sku_id} — {o.pack_size} {o.pack_unit} — {o.prezzo_unitario.toFixed(2)} €/conf. (sfrido: {o.sfrido.toFixed(2)})
                      </option>
                    ))
                  ) : (
                    <option value={overrideRow.sku_id}>{overrideRow.sku_id}</option>
                  )}
                  {/* also allow any sku from listino */}
                  <option disabled>─────────────</option>
                  {allSkuIds.filter(s => !overrideOptions.find(o => o.sku_id === s)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Quantità confezioni</label>
                <input type="number" min={0} className="input-field w-32" value={overrideQty} onChange={e => setOverrideQty(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={confirmOverride}>Conferma</button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setOverrideRowId(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
