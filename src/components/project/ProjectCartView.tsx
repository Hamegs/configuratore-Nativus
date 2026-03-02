import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useProjectStore } from '../../store/project-store';
import { loadDataStore } from '../../utils/data-loader';
import type { PackagingStrategy, ProjectCartRow } from '../../types/project';
import { computePackagingOptions } from '../../engine/packaging-optimizer';

const STRATEGIES: { id: PackagingStrategy; label: string; desc: string; isAuto: boolean }[] = [
  { id: 'MINIMO_SFRIDO',      label: 'Min. sfrido',       desc: 'Minimizza il materiale in eccesso',        isAuto: true  },
  { id: 'ECONOMICO',          label: 'Economico',          desc: 'Minimizza il costo totale',                isAuto: true  },
  { id: 'CONFEZIONI_GRANDI',  label: 'Conf. grandi',      desc: 'Usa sempre la pezzatura più grande',       isAuto: true  },
  { id: 'CONFEZIONI_PICCOLE', label: 'Conf. piccole',     desc: 'Usa sempre la pezzatura più piccola',      isAuto: true  },
  { id: 'MANUALE',            label: 'Manuale',            desc: 'Modifica libera delle singole righe',      isAuto: false },
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

function RowTitle({ row }: { row: ProjectCartRow }) {
  return (
    <div>
      <p className="font-medium text-gray-800 text-sm leading-tight">
        {row.descrizione}
        {row.pack_size > 0 && (
          <span className="ml-1 text-gray-500 font-normal">— {row.pack_size} {row.pack_unit}</span>
        )}
      </p>
      <p className="text-xs text-gray-400 font-mono mt-0.5">{row.sku_id}</p>
      {row.from_rooms && row.from_rooms.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {row.from_rooms.map(rm => (
            <span key={rm} className="inline-block rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500 font-medium">
              {rm}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectCartView() {
  const navigate = useNavigate();
  const {
    rooms, cart, strategy, waste_pct, setStrategy, setWastePct,
    overrideCartRow, excludeCartRow, restoreCartRow, removeCartRow, addManualRow,
    config_log,
  } = useProjectStore();
  const store = loadDataStore();

  const [overrideRowId, setOverrideRowId] = useState<string | null>(null);
  const [overrideSku, setOverrideSku] = useState('');
  const [overrideQty, setOverrideQty] = useState(1);
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualSearch, setManualSearch] = useState('');
  const [confirmAutoModal, setConfirmAutoModal] = useState<PackagingStrategy | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const isManual = strategy === 'MANUALE';
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
    if (s === 'MANUALE') {
      setStrategy('MANUALE', store);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
      return;
    }
    // switching from MANUALE to auto → ask confirmation
    if (isManual) {
      setConfirmAutoModal(s);
      return;
    }
    setStrategy(s, store);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  function confirmSwitchToAuto() {
    if (confirmAutoModal) {
      setStrategy(confirmAutoModal, store);
      setConfirmAutoModal(null);
    }
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

  const overrideRow = overrideRowId ? cart.find(r => r.row_id === overrideRowId) : null;
  const overrideOptions = useMemo(() => {
    if (!overrideRow?.product_id) return [];
    const skus = store.packagingSku.filter(p => p.product_id === overrideRow.product_id);
    if (skus.length === 0) return [];
    const qty_raw_est = overrideRow.qty_packs * overrideRow.pack_size;
    return computePackagingOptions(qty_raw_est, skus, store.listino);
  }, [overrideRow, store]);

  const hasApplicatoreData = configuredRooms.some(r => r.cart_result);

  async function handleExportXlsx() {
    try {
      const { exportProjectXlsx } = await import('../../utils/export-xlsx');
      exportProjectXlsx(configuredRooms, activeRows, strategy);
    } catch (e) { console.error(e); }
  }

  async function handleExportPdf() {
    try {
      const { exportProjectPdf } = await import('../../utils/export-pdf');
      exportProjectPdf(configuredRooms, activeRows);
    } catch (e) { console.error(e); }
  }

  async function handleExportRoomXlsx(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    try {
      const { exportRoomXlsx } = await import('../../utils/export-xlsx');
      exportRoomXlsx(room);
    } catch (e) { console.error(e); }
  }

  async function handleExportRoomPdf(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    try {
      const { exportRoomPdf } = await import('../../utils/export-pdf');
      exportRoomPdf(room);
    } catch (e) { console.error(e); }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carrello progetto</h1>
          <p className="text-sm text-gray-500 mt-1">
            {configuredRooms.length} {configuredRooms.length === 1 ? 'ambiente' : 'ambienti'} · {activeRows.length} righe attive
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Sfrido */}
          <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5">
            <label className="text-xs font-medium text-stone-600 whitespace-nowrap">Sfrido:</label>
            <input
              type="range"
              min={0} max={20} step={1}
              value={Math.round((waste_pct ?? 0.08) * 100)}
              onChange={e => setWastePct(Number(e.target.value) / 100, store)}
              className="w-20 accent-stone-700"
            />
            <span className="text-xs font-bold text-stone-800 w-6 text-right">{Math.round((waste_pct ?? 0.08) * 100)}%</span>
          </div>
          {/* Export */}
          <button type="button" className="btn-secondary text-xs flex items-center gap-1" onClick={handleExportXlsx} disabled={activeRows.length === 0}>
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button type="button" className="btn-secondary text-xs flex items-center gap-1" onClick={handleExportPdf} disabled={activeRows.length === 0}>
            <FileText size={13} /> PDF
          </button>
          {savedFeedback && (
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg animate-pulse">
              ✓ Configurazione salvata
            </span>
          )}
          {hasApplicatoreData && (
            <button
              type="button"
              className="btn-secondary text-sm font-medium"
              onClick={() => navigate('/progetto/applicatore')}
            >
              Vista Applicatore →
            </button>
          )}
          {activeRows.length > 0 && (
            <button
              type="button"
              className="btn-primary px-5 py-2 text-sm font-semibold"
              onClick={() => window.print()}
            >
              Genera ordine / Stampa
            </button>
          )}
          <button type="button" className="btn-secondary text-sm" onClick={() => navigate('/progetto')}>
            ← Ambienti
          </button>
        </div>
      </div>


      {/* Modalità packaging */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm text-gray-700">Ottimizzazione packaging</h2>
            <p className="text-xs text-gray-400 mt-0.5">Clicca una strategia — il carrello si ricalcola e si salva automaticamente.</p>
          </div>
          {isManual && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Modalità manuale — righe modificabili
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleStrategyChange(s.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                strategy === s.id
                  ? s.isAuto ? 'border-brand-500 bg-brand-50' : 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`text-xs font-semibold ${
                strategy === s.id
                  ? s.isAuto ? 'text-brand-700' : 'text-amber-700'
                  : 'text-gray-700'
              }`}>{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Righe carrello */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Righe ordine</h2>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => { setShowAddManual(true); }}
          >
            + Aggiungi da listino
          </button>
        </div>

        {showAddManual && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-700">Aggiungi articolo da listino</h3>
              <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Attiva modalità manuale</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="label-text">Cerca SKU</label>
                <input
                  type="search"
                  className="input-field text-xs"
                  placeholder="Cerca..."
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                />
                <select
                  className="input-field text-xs mt-1"
                  size={4}
                  value={manualSku}
                  onChange={e => setManualSku(e.target.value)}
                >
                  <option value="">— seleziona —</option>
                  {filteredSkus.slice(0, 50).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Quantità (confezioni)</label>
                <input
                  type="number"
                  min={1}
                  className="input-field text-xs w-24"
                  value={manualQty}
                  onChange={e => setManualQty(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={handleAddManual}
                  disabled={!manualSku}
                >
                  Aggiungi
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setShowAddManual(false)}
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {!isManual && activeRows.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
            Modalità automatica — righe bloccate. Passa a <strong>Manuale</strong> per modificarle.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 w-4"></th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Prodotto</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Sezione</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Conf.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">€/conf.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Totale €</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map(row => (
                <tr key={row.row_id} className={`border-b border-gray-50 ${isManual ? 'hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-2 py-1.5">
                    {row.source === 'manual' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded font-semibold">M</span>
                    )}
                    {row.is_override && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-1">*</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><RowTitle row={row} /></td>
                  <td className="px-3 py-1.5"><SectionBadge section={row.section} /></td>
                  <td className="px-3 py-1.5 text-right font-semibold">{row.qty_packs}</td>
                  <td className="px-3 py-1.5 text-right text-gray-500">{row.prezzo_unitario.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{row.totale.toFixed(2)}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {isManual ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="text-brand-600 hover:underline"
                          onClick={() => openOverride(row)}
                        >
                          Modifica
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          className="text-amber-600 hover:underline"
                          onClick={() => excludeCartRow(row.row_id)}
                        >
                          Escludi
                        </button>
                        {row.source === 'manual' && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              className="text-red-500 hover:underline"
                              onClick={() => removeCartRow(row.row_id)}
                            >
                              Rimuovi
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {activeRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    Nessuna riga attiva. Configura degli ambienti e genera il carrello dal progetto.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={5} className="px-3 py-2 text-right font-semibold text-gray-700">Totale</td>
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
                    <td className="px-3 py-1.5 max-w-xs">
                      <p className="font-medium text-gray-400 line-through truncate">{row.descrizione}</p>
                      <p className="text-gray-400 font-mono text-xs">{row.sku_id}</p>
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-400 line-through whitespace-nowrap">{row.qty_packs} × {row.pack_size} {row.pack_unit}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-brand-600 hover:underline"
                        onClick={() => restoreCartRow(row.row_id)}
                      >
                        Ripristina
                      </button>
                      {(isManual || row.source === 'manual') && (
                        <>
                          <span className="text-gray-300 mx-1">|</span>
                          <button
                            type="button"
                            className="text-red-500 hover:underline"
                            onClick={() => removeCartRow(row.row_id)}
                          >
                            Rimuovi
                          </button>
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

      {/* Riepilogo per ambiente */}
      {configuredRooms.length > 0 && (
        <div className="card p-4 space-y-2">
          <h2 className="font-semibold text-sm text-gray-700">Riepilogo per ambiente</h2>
          {configuredRooms.map(room => {
            const roomTotal = room.cart_lines.reduce((a, l) => a + (l.qty * (l.prezzo_unitario ?? 0)), 0);
            const displayName = room.custom_name || room.room_type;
            return (
              <div key={room.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0 gap-2">
                <span className="text-gray-700 font-medium flex-1">{displayName}</span>
                <span className="text-gray-500 text-xs">{room.cart_lines.length} prodotti</span>
                <span className="font-semibold text-gray-800 w-24 text-right">{roomTotal.toFixed(2)} €</span>
                <button type="button" title="Esporta Excel" className="p-1 text-stone-400 hover:text-stone-700" onClick={() => handleExportRoomXlsx(room.id)}>
                  <FileSpreadsheet size={14} />
                </button>
                <button type="button" title="Esporta PDF" className="p-1 text-stone-400 hover:text-stone-700" onClick={() => handleExportRoomPdf(room.id)}>
                  <FileText size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Finalizza */}
      {activeRows.length > 0 && (
        <div className="flex items-center justify-between bg-brand-50 rounded-xl px-5 py-4 border border-brand-200">
          <div>
            <p className="text-sm font-semibold text-brand-800">Totale ordine</p>
            <p className="text-2xl font-bold text-brand-700 mt-0.5">{totalActive.toFixed(2)} €</p>
            <p className="text-xs text-brand-500 mt-0.5">{activeRows.length} righe · {strategy}</p>
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            {hasApplicatoreData && (
              <button
                type="button"
                className="btn-secondary text-sm px-4 py-2"
                onClick={() => navigate('/progetto/applicatore')}
              >
                Vista Applicatore
              </button>
            )}
            <button
              type="button"
              className="btn-primary px-6 py-3 text-sm font-semibold"
              onClick={() => window.print()}
            >
              Stampa / Esporta ordine
            </button>
          </div>
        </div>
      )}

      {/* Log modifiche */}
      {config_log.length > 0 && (
        <div className="card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
            onClick={() => setShowLog(v => !v)}
          >
            <h2 className="text-sm font-semibold text-gray-700">Log modifiche manuali ({config_log.length})</h2>
            <span className="text-gray-400 text-xs">{showLog ? '▲ Nascondi' : '▼ Mostra'}</span>
          </div>
          {showLog && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Data/ora', 'Prodotto', 'SKU', 'Azione', 'Qty prima', 'Qty dopo', 'Modo'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config_log.slice(0, 50).map(e => (
                    <tr key={e.id} className="border-b border-gray-50">
                      <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{new Date(e.timestamp).toLocaleString('it-IT')}</td>
                      <td className="px-3 py-1.5 text-gray-700 truncate max-w-xs">{e.product_name}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{e.sku_id}</td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          e.action === 'add_manual' ? 'bg-yellow-100 text-yellow-700' :
                          e.action === 'override' ? 'bg-blue-100 text-blue-700' :
                          e.action === 'exclude' ? 'bg-amber-100 text-amber-700' :
                          e.action === 'remove' ? 'bg-red-100 text-red-700' :
                          'bg-green-100 text-green-700'
                        }`}>{e.action}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right">{e.qty_before}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{e.qty_after}</td>
                      <td className="px-3 py-1.5 text-gray-400">{e.mode_before}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal override */}
      {overrideRowId && overrideRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full space-y-4">
            <h3 className="font-bold text-gray-900">
              Modifica riga: <span className="font-mono text-brand-700">{overrideRow.product_id}</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label-text">SKU / Pezzatura</label>
                <select
                  className="input-field"
                  value={overrideSku}
                  onChange={e => setOverrideSku(e.target.value)}
                >
                  {overrideOptions.length > 0 ? (
                    overrideOptions.map(o => (
                      <option key={o.sku_id} value={o.sku_id}>
                        {o.sku_id} — {o.pack_size} {o.pack_unit} — {o.prezzo_unitario.toFixed(2)} €/conf. (sfrido: {o.sfrido.toFixed(2)})
                      </option>
                    ))
                  ) : (
                    <option value={overrideRow.sku_id}>{overrideRow.sku_id}</option>
                  )}
                  <option disabled>─────────────</option>
                  {allSkuIds
                    .filter(s => !overrideOptions.find(o => o.sku_id === s))
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Quantità confezioni</label>
                <input
                  type="number"
                  min={0}
                  className="input-field w-32"
                  value={overrideQty}
                  onChange={e => setOverrideQty(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={confirmOverride}>Conferma</button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setOverrideRowId(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* Conferma cambio da manuale ad auto */}
      {confirmAutoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Passare a modalità automatica?</h3>
            <p className="text-sm text-gray-600">
              Le modifiche manuali alle righe verranno sovrascritte con il ricalcolo automatico.
              Il log delle modifiche rimane disponibile.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={confirmSwitchToAuto}>
                Sì, ricalcola
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmAutoModal(null)}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
