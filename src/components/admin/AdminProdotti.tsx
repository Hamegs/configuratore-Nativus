import React, { useState, useMemo } from 'react';
import type { DataStore } from '../../utils/data-loader';
import { useAdminStore } from '../../store/admin-store';
import { COMMERCIAL_NAMES, getDefaultCommercialName } from '../../utils/product-names';

interface Props {
  store: DataStore;
}

interface ProductRow {
  product_id: string;
  officialName: string;
  commercialName: string;
  type: string;
  skuCount: number;
  stepCount: number;
  texSkuCount: number;
  isOverridden: boolean;
}

export function AdminProdotti({ store }: Props) {
  const { overrides, saveCommercialNames } = useAdminStore();

  const commercialNamesOverride = overrides.commercialNames ?? {};
  const stepLibrary = overrides.stepLibrary ?? store.stepLibrary;
  const packagingSku = overrides.packagingSku ?? store.packagingSku;

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saved, setSaved] = useState(false);

  const rows = useMemo((): ProductRow[] => {
    const ids = new Set<string>();
    store.prodotti.forEach(p => ids.add(p.product_id));
    packagingSku.forEach(s => ids.add(s.product_id));
    Object.keys(COMMERCIAL_NAMES).forEach(k => ids.add(k));

    return Array.from(ids).sort().map(pid => {
      const prodotto = store.prodotti.find(p => p.product_id === pid);
      const isOverridden = pid in commercialNamesOverride;
      const commercialName = commercialNamesOverride[pid] ?? getDefaultCommercialName(pid) ?? pid;
      const skuCount = packagingSku.filter(s => s.product_id === pid).length;
      const stepCount = stepLibrary.filter(s => s.product_id === pid).length;
      const texSkuCount = store.texturePackagingSku.filter(t => t.product_id === pid).length;

      return {
        product_id: pid,
        officialName: prodotto?.name ?? '—',
        commercialName,
        type: prodotto?.type ?? '—',
        skuCount,
        stepCount,
        texSkuCount,
        isOverridden,
      };
    });
  }, [store.prodotti, packagingSku, stepLibrary, store.texturePackagingSku, commercialNamesOverride]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.product_id.toLowerCase().includes(q) ||
      r.officialName.toLowerCase().includes(q) ||
      r.commercialName.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const selected = useMemo(() => rows.find(r => r.product_id === selectedId) ?? null, [rows, selectedId]);

  const selectedSteps = useMemo(() =>
    selectedId ? stepLibrary.filter(s => s.product_id === selectedId) : [],
    [stepLibrary, selectedId]
  );

  const selectedSkus = useMemo(() =>
    selectedId ? packagingSku.filter(s => s.product_id === selectedId) : [],
    [packagingSku, selectedId]
  );

  const selectedTexSkus = useMemo(() =>
    selectedId ? store.texturePackagingSku.filter(t => t.product_id === selectedId) : [],
    [store.texturePackagingSku, selectedId]
  );

  function openModal(pid: string) {
    setSelectedId(pid);
    const current = commercialNamesOverride[pid] ?? getDefaultCommercialName(pid) ?? pid;
    setEditName(current);
  }

  function saveName() {
    if (!selectedId) return;
    const updated = { ...commercialNamesOverride, [selectedId]: editName.trim() };
    saveCommercialNames(updated);
    flash();
  }

  function resetName() {
    if (!selectedId) return;
    const updated = { ...commercialNamesOverride };
    delete updated[selectedId];
    saveCommercialNames(updated);
    const def = getDefaultCommercialName(selectedId) ?? selectedId;
    setEditName(def);
    flash();
  }

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const overriddenCount = Object.keys(commercialNamesOverride).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          type="search"
          placeholder="Cerca per product_id, nome, tipo..."
          className="input-field max-w-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600 font-medium">Salvato</span>}
          {overriddenCount > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              {overriddenCount} nome/i personalizzati
            </span>
          )}
          <span className="text-xs text-gray-400">{rows.length} prodotti totali</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
        Qui puoi modificare il <strong>nome commerciale</strong> visualizzato nel carrello e nei documenti.
        Le pezzature e i prezzi si modificano nella tab <strong>Listino</strong>.
        I consumi si modificano nella tab <strong>Stratigrafie</strong>.
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Product ID', 'Nome ufficiale', 'Nome commerciale (carrello)', 'Tipo', 'SKU', 'Step', 'Tex', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.product_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono text-gray-600 whitespace-nowrap text-xs">{row.product_id}</td>
                  <td className="px-3 py-1.5 text-gray-500 max-w-[180px] truncate">{row.officialName}</td>
                  <td className="px-3 py-1.5 max-w-[200px] truncate">
                    <span className={row.isOverridden ? 'font-semibold text-brand-700' : 'text-gray-700'}>
                      {row.commercialName}
                    </span>
                    {row.isOverridden && (
                      <span className="ml-1.5 text-amber-600 text-xs font-normal">(personalizzato)</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{row.type}</td>
                  <td className="px-3 py-1.5 text-center">
                    {row.skuCount > 0 ? (
                      <span className="inline-block min-w-[20px] text-center font-semibold text-blue-600">{row.skuCount}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {row.stepCount > 0 ? (
                      <span className="inline-block min-w-[20px] text-center font-semibold text-green-600">{row.stepCount}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {row.texSkuCount > 0 ? (
                      <span className="inline-block min-w-[20px] text-center font-semibold text-purple-600">{row.texSkuCount}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline whitespace-nowrap"
                      onClick={() => openModal(row.product_id)}
                    >
                      Gestisci
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                    Nessun risultato per "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-3xl w-full space-y-5 max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{selected.officialName}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selected.product_id} · {selected.type}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none flex-shrink-0"
                onClick={() => setSelectedId(null)}
              >
                ×
              </button>
            </div>

            <div className="space-y-2 p-4 bg-brand-50 border border-brand-200 rounded-lg">
              <label className="label-text font-semibold text-brand-900 text-sm">
                Nome commerciale — apparirà nel carrello e nei documenti
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1 text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Es. Primer SW, Rasante Base Quarzo..."
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); }}
                />
                <button
                  type="button"
                  className="btn-primary text-sm px-5"
                  onClick={saveName}
                  disabled={!editName.trim()}
                >
                  Salva
                </button>
              </div>
              {selected.isOverridden && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-amber-700">
                    Nome predefinito: <span className="font-mono">{getDefaultCommercialName(selectedId) ?? selectedId}</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-red-600 underline"
                    onClick={resetName}
                  >
                    Ripristina predefinito
                  </button>
                </div>
              )}
              {!selected.isOverridden && getDefaultCommercialName(selectedId) && (
                <p className="text-xs text-gray-400">Nome predefinito — modificabile sopra.</p>
              )}
              {!getDefaultCommercialName(selectedId) && !selected.isOverridden && (
                <p className="text-xs text-amber-600">Nessun nome commerciale definito per questo product_id.</p>
              )}
            </div>

            {selectedSteps.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">
                    Usato in {selectedSteps.length} step stratigrafici
                  </h4>
                  <span className="text-xs text-gray-400 italic">modifica consumi nella tab Stratigrafie</span>
                </div>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Step ID</th>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Nome step</th>
                        <th className="px-3 py-1.5 text-right font-medium text-gray-500">Consumo</th>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Unità</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSteps.map(s => (
                        <tr key={s.step_id} className="border-b border-gray-50">
                          <td className="px-3 py-1.5 font-mono text-gray-400 text-xs">{s.step_id}</td>
                          <td className="px-3 py-1.5 text-gray-700">{s.name}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-gray-900">{s.qty ?? '—'}</td>
                          <td className="px-3 py-1.5 text-gray-500">{s.unit ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedSkus.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">
                    {selectedSkus.length} pezzature disponibili (packaging)
                  </h4>
                  <span className="text-xs text-gray-400 italic">modifica pezzature e prezzi nella tab Listino</span>
                </div>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">SKU ID</th>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Descrizione</th>
                        <th className="px-3 py-1.5 text-right font-medium text-gray-500">Pezzatura</th>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Unità</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSkus.map(s => (
                        <tr key={s.sku_id} className="border-b border-gray-50">
                          <td className="px-3 py-1.5 font-mono text-gray-400 text-xs">{s.sku_id}</td>
                          <td className="px-3 py-1.5 text-gray-700">{s.descrizione_sku}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-gray-900">{s.pack_size}</td>
                          <td className="px-3 py-1.5 text-gray-500">{s.pack_unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedTexSkus.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">
                  {selectedTexSkus.length} SKU texture
                </h4>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">SKU ID</th>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Linea</th>
                        <th className="px-3 py-1.5 text-left font-medium text-gray-500">Componente</th>
                        <th className="px-3 py-1.5 text-right font-medium text-gray-500">Pack mq</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTexSkus.map(t => (
                        <tr key={t.sku_id} className="border-b border-gray-50">
                          <td className="px-3 py-1.5 font-mono text-gray-400 text-xs">{t.sku_id}</td>
                          <td className="px-3 py-1.5 text-gray-700">{t.line_id}</td>
                          <td className="px-3 py-1.5 text-gray-600">{t.component}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-gray-900">
                            {t.pack_size_mq ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedSteps.length === 0 && selectedSkus.length === 0 && selectedTexSkus.length === 0 && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                Questo product_id non risulta usato in nessuna stratigrafia, pezzatura o regola texture.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setSelectedId(null)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
