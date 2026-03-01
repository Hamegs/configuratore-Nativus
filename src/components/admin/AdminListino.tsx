import React, { useState, useMemo } from 'react';
import type { PackagingSku, ListinoSku } from '../../types/packaging';
import type { StepLibraryEntry } from '../../types/step';
import { useAdminStore } from '../../store/admin-store';
import type { DataStore } from '../../utils/data-loader';

interface Props {
  store: DataStore;
}

interface FlatRow {
  sku_id: string;
  product_id: string;
  descrizione_sku: string;
  pack_size: number;
  pack_unit: string;
  prezzo_listino: number;
  isModified?: boolean;
}

function getProductUsages(productId: string, stepLibrary: StepLibraryEntry[]): string[] {
  return stepLibrary
    .filter(s => s.product_id === productId)
    .map(s => `${s.step_id} — ${s.name}`);
}

function buildRows(packagingSku: PackagingSku[], listino: ListinoSku[]): FlatRow[] {
  return packagingSku.map(p => {
    const l = listino.find(x => x.sku_id === p.sku_id);
    return {
      sku_id: p.sku_id,
      product_id: p.product_id,
      descrizione_sku: p.descrizione_sku,
      pack_size: p.pack_size,
      pack_unit: p.pack_unit,
      prezzo_listino: l?.prezzo_listino ?? 0,
    };
  });
}

const EMPTY_NEW: Omit<FlatRow, 'isModified'> = {
  sku_id: '',
  product_id: '',
  descrizione_sku: '',
  pack_size: 1,
  pack_unit: 'kg',
  prezzo_listino: 0,
};

export function AdminListino({ store }: Props) {
  const { overrides, savePackagingSku, saveListino } = useAdminStore();

  const packagingSku = overrides.packagingSku ?? store.packagingSku;
  const listino = overrides.listino ?? store.listino;
  const stepLibrary = overrides.stepLibrary ?? store.stepLibrary;

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<FlatRow>>({});
  const [deleteTarget, setDeleteTarget] = useState<FlatRow | null>(null);
  const [deleteUsages, setDeleteUsages] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Omit<FlatRow, 'isModified'>>({ ...EMPTY_NEW });
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);

  const rows = useMemo(() => buildRows(packagingSku, listino), [packagingSku, listino]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? rows.filter(r =>
      r.sku_id.toLowerCase().includes(q) ||
      r.product_id.toLowerCase().includes(q) ||
      r.descrizione_sku.toLowerCase().includes(q)
    ) : rows;
  }, [rows, search]);

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function persistEdit() {
    if (!editId) return;
    const updatedPkg = packagingSku.map(p =>
      p.sku_id === editId
        ? { ...p, descrizione_sku: editData.descrizione_sku ?? p.descrizione_sku, pack_size: editData.pack_size ?? p.pack_size, pack_unit: editData.pack_unit ?? p.pack_unit }
        : p
    );
    const updatedListino = listino.map(l =>
      l.sku_id === editId ? { ...l, prezzo_listino: editData.prezzo_listino ?? l.prezzo_listino } : l
    );
    savePackagingSku(updatedPkg);
    saveListino(updatedListino);
    setEditId(null);
    setEditData({});
    flash();
  }

  function requestDelete(row: FlatRow) {
    const usages = getProductUsages(row.product_id, stepLibrary);
    setDeleteTarget(row);
    setDeleteUsages(usages);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const newPkg = packagingSku.filter(p => p.sku_id !== deleteTarget.sku_id);
    const newList = listino.filter(l => l.sku_id !== deleteTarget.sku_id);
    savePackagingSku(newPkg);
    saveListino(newList);
    setDeleteTarget(null);
    setDeleteUsages([]);
    flash();
  }

  function addProduct() {
    if (!newRow.sku_id || !newRow.product_id) return;
    const pkg: PackagingSku = {
      sku_id: newRow.sku_id,
      product_id: newRow.product_id,
      descrizione_sku: newRow.descrizione_sku,
      pack_size: newRow.pack_size,
      pack_unit: newRow.pack_unit,
      componenti: '',
      note_packaging: '',
    };
    const lis: ListinoSku = {
      sku_id: newRow.sku_id,
      prezzo_listino: newRow.prezzo_listino,
      valuta: 'EUR',
      valid_from: '',
      valid_to: '',
      note_prezzo: '',
    };
    savePackagingSku([...packagingSku, pkg]);
    saveListino([...listino, lis]);
    setNewRow({ ...EMPTY_NEW });
    setShowAdd(false);
    flash();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="search"
          placeholder="Cerca SKU o prodotto..."
          className="input-field max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 font-medium">Salvato</span>}
          <button type="button" className="btn-primary text-sm" onClick={() => setShowAdd(true)}>
            + Aggiungi prodotto
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 border-brand-200 bg-brand-50 space-y-3">
          <h3 className="font-semibold text-sm text-gray-800">Nuovo prodotto</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { key: 'sku_id', label: 'SKU ID', type: 'text' },
              { key: 'product_id', label: 'Product ID', type: 'text' },
              { key: 'descrizione_sku', label: 'Descrizione', type: 'text' },
              { key: 'pack_size', label: 'Pezzatura', type: 'number' },
              { key: 'pack_unit', label: 'Unità', type: 'text' },
              { key: 'prezzo_listino', label: 'Prezzo EUR', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="label-text">{f.label}</label>
                <input
                  type={f.type}
                  className="input-field"
                  value={String((newRow as Record<string, unknown>)[f.key] ?? '')}
                  onChange={e => setNewRow(r => ({ ...r, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-sm" onClick={addProduct}>Aggiungi</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowAdd(false)}>Annulla</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['SKU ID', 'Product ID', 'Descrizione', 'Pezzatura', 'Unità', 'Prezzo EUR', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.sku_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono text-gray-700 whitespace-nowrap">{row.sku_id}</td>
                  <td className="px-3 py-1.5 text-brand-700 font-medium whitespace-nowrap">{row.product_id}</td>
                  {editId === row.sku_id ? (
                    <>
                      <td className="px-2 py-1"><input type="text" className="input-field text-xs py-0.5" value={editData.descrizione_sku ?? row.descrizione_sku} onChange={e => setEditData(d => ({ ...d, descrizione_sku: e.target.value }))} /></td>
                      <td className="px-2 py-1"><input type="number" className="input-field text-xs py-0.5 w-20" value={editData.pack_size ?? row.pack_size} onChange={e => setEditData(d => ({ ...d, pack_size: parseFloat(e.target.value) || 0 }))} /></td>
                      <td className="px-2 py-1"><input type="text" className="input-field text-xs py-0.5 w-16" value={editData.pack_unit ?? row.pack_unit} onChange={e => setEditData(d => ({ ...d, pack_unit: e.target.value }))} /></td>
                      <td className="px-2 py-1"><input type="number" step="0.01" className="input-field text-xs py-0.5 w-24" value={editData.prezzo_listino ?? row.prezzo_listino} onChange={e => setEditData(d => ({ ...d, prezzo_listino: parseFloat(e.target.value) || 0 }))} /></td>
                      <td className="px-2 py-1 whitespace-nowrap space-x-1">
                        <button type="button" className="btn-primary text-xs py-0.5 px-2" onClick={persistEdit}>Salva</button>
                        <button type="button" className="btn-secondary text-xs py-0.5 px-2" onClick={() => setEditId(null)}>Annulla</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-1.5 text-gray-600 max-w-xs truncate">{row.descrizione_sku}</td>
                      <td className="px-3 py-1.5 text-right">{row.pack_size}</td>
                      <td className="px-3 py-1.5 text-gray-500">{row.pack_unit}</td>
                      <td className="px-3 py-1.5 font-semibold text-right">{row.prezzo_listino.toFixed(2)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap space-x-1">
                        <button type="button" className="text-brand-600 hover:underline" onClick={() => { setEditId(row.sku_id); setEditData({ descrizione_sku: row.descrizione_sku, pack_size: row.pack_size, pack_unit: row.pack_unit, prezzo_listino: row.prezzo_listino }); }}>Modifica</button>
                        <span className="text-gray-300">|</span>
                        <button type="button" className="text-red-500 hover:underline" onClick={() => requestDelete(row)}>Elimina</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full space-y-4">
            <h3 className="font-bold text-gray-900">Elimina prodotto</h3>
            {deleteUsages.length > 0 ? (
              <>
                <div className="alert-hard text-sm">
                  Impossibile eliminare <strong>{deleteTarget.sku_id}</strong> (product_id: <strong>{deleteTarget.product_id}</strong>).<br />
                  È usato in {deleteUsages.length} step:
                </div>
                <ul className="text-xs space-y-1 max-h-40 overflow-y-auto bg-gray-50 rounded p-3">
                  {deleteUsages.map((u, i) => <li key={i} className="font-mono text-gray-700">{u}</li>)}
                </ul>
                <p className="text-sm text-gray-600">Modifica prima le stratigrafie nella tab <strong>Stratigrafie</strong>, poi torna qui.</p>
                <button type="button" className="btn-secondary w-full" onClick={() => setDeleteTarget(null)}>Chiudi</button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">Confermi l'eliminazione di <strong>{deleteTarget.sku_id}</strong>?<br />Questa azione è reversibile solo tramite "Ripristina dati originali".</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary bg-red-600 hover:bg-red-700 flex-1" onClick={confirmDelete}>Elimina</button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => setDeleteTarget(null)}>Annulla</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
