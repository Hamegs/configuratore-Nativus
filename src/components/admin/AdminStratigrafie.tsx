import React, { useState, useMemo } from 'react';
import type { StepLibraryEntry } from '../../types/step';
import type { StepMapEntry } from '../../types/regole';
import type { StepTypeId } from '../../types/enums';
import { useAdminStore } from '../../store/admin-store';
import type { DataStore } from '../../utils/data-loader';

interface Props {
  store: DataStore;
}

const STEP_TYPE_COLORS: Record<StepTypeId, string> = {
  MECH: 'bg-gray-200 text-gray-700',
  PRIM: 'bg-blue-100 text-blue-700',
  REPR: 'bg-yellow-100 text-yellow-700',
  WPRO: 'bg-cyan-100 text-cyan-700',
  STRC: 'bg-indigo-100 text-indigo-700',
  ARMR: 'bg-purple-100 text-purple-700',
  ADDV: 'bg-orange-100 text-orange-700',
  WAIT: 'bg-slate-100 text-slate-600',
  GATE: 'bg-red-100 text-red-700',
  NOTE: 'bg-green-100 text-green-700',
};

function StepTypeBadge({ type }: { type: StepTypeId }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${STEP_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  );
}

type StepRow = StepLibraryEntry & { step_order: number };

function buildStepRows(ruleId: string, stepMap: StepMapEntry[], stepLibrary: StepLibraryEntry[]): StepRow[] {
  return stepMap
    .filter(e => e.rule_id === ruleId)
    .sort((a, b) => a.step_order - b.step_order)
    .map(e => {
      const lib = stepLibrary.find(s => s.step_id === e.step_id) ?? {
        step_id: e.step_id,
        step_type_id: 'NOTE' as StepTypeId,
        name: `[MANCANTE: ${e.step_id}]`,
        product_id: null,
        qty: null,
        unit: null,
      };
      return { ...lib, step_order: e.step_order };
    });
}

const STEP_TYPES: StepTypeId[] = ['MECH','PRIM','REPR','WPRO','STRC','ARMR','ADDV','WAIT','GATE','NOTE'];

export function AdminStratigrafie({ store }: Props) {
  const { overrides, saveStepLibrary, saveStepMap } = useAdminStore();

  const stepLibrary = useMemo(() => overrides.stepLibrary ?? store.stepLibrary, [overrides.stepLibrary, store.stepLibrary]);
  const stepMap = useMemo(() => overrides.stepMap ?? store.stepMap, [overrides.stepMap, store.stepMap]);
  const packagingSku = overrides.packagingSku ?? store.packagingSku;

  const allProductIds = useMemo(() => {
    const ids = [...new Set(packagingSku.map(p => p.product_id))].sort();
    return ids;
  }, [packagingSku]);

  // rule list: unique rule_ids from stepMap, joined with decisionTable for label
  const ruleIds = useMemo(() => {
    const ids = [...new Set(stepMap.map(e => e.rule_id))].sort();
    return ids;
  }, [stepMap]);

  const [search, setSearch] = useState('');
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState<StepRow[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const filteredRules = useMemo(() => {
    const q = search.toLowerCase();
    return q ? ruleIds.filter(r => r.toLowerCase().includes(q)) : ruleIds;
  }, [ruleIds, search]);

  function selectRule(ruleId: string) {
    if (dirty && !confirm('Hai modifiche non salvate. Continuare?')) return;
    setSelectedRule(ruleId);
    setLocalRows(buildStepRows(ruleId, stepMap, stepLibrary));
    setEditIdx(null);
    setDirty(false);
  }

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function saveChanges() {
    if (!selectedRule) return;

    // 1. Rebuild step_map for this rule (remove old, add new)
    const otherMaps = stepMap.filter(e => e.rule_id !== selectedRule);
    const newMaps: StepMapEntry[] = localRows.map((r, i) => ({
      rule_id: selectedRule,
      step_order: (i + 1) * 10,
      step_id: r.step_id,
    }));

    // 2. Upsert step_library entries for each row
    const updatedLib = [...stepLibrary];
    for (const row of localRows) {
      const idx = updatedLib.findIndex(s => s.step_id === row.step_id);
      const entry: StepLibraryEntry = {
        step_id: row.step_id,
        step_type_id: row.step_type_id,
        name: row.name,
        product_id: row.product_id,
        qty: row.qty,
        unit: row.unit,
      };
      if (idx >= 0) updatedLib[idx] = entry;
      else updatedLib.push(entry);
    }

    saveStepMap([...otherMaps, ...newMaps]);
    saveStepLibrary(updatedLib);
    setDirty(false);
    flash();
  }

  function updateRow(idx: number, patch: Partial<StepRow>) {
    setLocalRows(rows => rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
    setDirty(true);
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setLocalRows(rows => {
      const r = [...rows];
      [r[idx - 1], r[idx]] = [r[idx], r[idx - 1]];
      return r;
    });
    setDirty(true);
  }

  function moveDown(idx: number) {
    setLocalRows(rows => {
      if (idx >= rows.length - 1) return rows;
      const r = [...rows];
      [r[idx], r[idx + 1]] = [r[idx + 1], r[idx]];
      return r;
    });
    setDirty(true);
  }

  function deleteRow(idx: number) {
    setLocalRows(rows => rows.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function addStep() {
    const newOrder = (localRows.length + 1) * 10;
    const newId = `${selectedRule}_S${newOrder}`;
    const newRow: StepRow = {
      step_id: newId,
      step_type_id: 'NOTE',
      name: '',
      product_id: null,
      qty: null,
      unit: null,
      step_order: newOrder,
    };
    setLocalRows(rows => [...rows, newRow]);
    setEditIdx(localRows.length);
    setDirty(true);
  }

  function getSupportLabel(ruleId: string): string {
    const rule = store.decisionTable.find(r => r.rule_id === ruleId);
    if (!rule) return ruleId;
    const sup = store.supporti.find(s => s.support_id === rule.support_id);
    return `${sup?.name ?? rule.support_id} · ${rule.env_id}${rule.zona_doccia === '1' ? ' · Doccia' : ''}${rule.din === '1' ? ' · DIN' : ''}`;
  }

  return (
    <div className="flex gap-4 h-[72vh]">
      {/* Left: rule list */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <input
          type="search"
          placeholder="Cerca regola..."
          className="input-field text-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-white">
          {filteredRules.map(ruleId => (
            <button
              key={ruleId}
              type="button"
              onClick={() => selectRule(ruleId)}
              className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedRule === ruleId ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-700'}`}
            >
              <div className="font-mono">{ruleId}</div>
              <div className="text-gray-400 truncate mt-0.5">{getSupportLabel(ruleId)}</div>
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-400">{filteredRules.length} regole</div>
      </div>

      {/* Right: step editor */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {!selectedRule ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Seleziona una regola
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold text-brand-700">{selectedRule}</span>
                <span className="ml-2 text-xs text-gray-500">{getSupportLabel(selectedRule)}</span>
              </div>
              <div className="flex items-center gap-2">
                {saved && <span className="text-xs text-green-600 font-medium">Salvato</span>}
                {dirty && <span className="text-xs text-amber-600 font-medium">Modifiche non salvate</span>}
                <button type="button" className="btn-secondary text-xs" onClick={addStep}>+ Step</button>
                <button type="button" className="btn-primary text-xs" onClick={saveChanges} disabled={!dirty}>Salva</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 border-b border-gray-100">
                  <tr>
                    <th className="px-2 py-2 w-16 text-gray-400">Ord.</th>
                    <th className="px-2 py-2 text-left text-gray-500">Tipo</th>
                    <th className="px-2 py-2 text-left text-gray-500">Nome step</th>
                    <th className="px-2 py-2 text-left text-gray-500">Prodotto</th>
                    <th className="px-2 py-2 w-20 text-gray-500">Quantità</th>
                    <th className="px-2 py-2 w-16 text-gray-500">Unità</th>
                    <th className="px-2 py-2 w-24 text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {localRows.map((row, idx) => (
                    <tr key={row.step_id + idx} className={`border-b border-gray-50 ${editIdx === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          <button type="button" className="text-gray-400 hover:text-gray-700 leading-none" onClick={() => moveUp(idx)} title="Su">▲</button>
                          <span className="text-gray-400 font-mono">{(idx + 1) * 10}</span>
                          <button type="button" className="text-gray-400 hover:text-gray-700 leading-none" onClick={() => moveDown(idx)} title="Giù">▼</button>
                        </div>
                      </td>
                      {editIdx === idx ? (
                        <>
                          <td className="px-1 py-1">
                            <select className="input-field text-xs py-0.5" value={row.step_type_id} onChange={e => updateRow(idx, { step_type_id: e.target.value as StepTypeId })}>
                              {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" className="input-field text-xs py-0.5 w-full min-w-0" value={row.name} onChange={e => updateRow(idx, { name: e.target.value })} />
                          </td>
                          <td className="px-1 py-1">
                            <select className="input-field text-xs py-0.5" value={row.product_id ?? ''} onChange={e => updateRow(idx, { product_id: e.target.value || null })}>
                              <option value="">— nessun prodotto —</option>
                              {allProductIds.map(pid => <option key={pid} value={pid}>{pid}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1">
                            <input type="number" className="input-field text-xs py-0.5 w-full" value={row.qty ?? ''} onChange={e => updateRow(idx, { qty: e.target.value ? parseFloat(e.target.value) : null })} placeholder="—" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" className="input-field text-xs py-0.5 w-full" value={row.unit ?? ''} onChange={e => updateRow(idx, { unit: e.target.value || null })} placeholder="g/m²" />
                          </td>
                          <td className="px-1 py-1 whitespace-nowrap">
                            <button type="button" className="text-green-600 hover:underline mr-1" onClick={() => setEditIdx(null)}>OK</button>
                            <button type="button" className="text-red-500 hover:underline" onClick={() => deleteRow(idx)}>Elimina</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5"><StepTypeBadge type={row.step_type_id} /></td>
                          <td className="px-2 py-1.5 text-gray-800 max-w-xs">{row.name || <span className="text-gray-300 italic">—</span>}</td>
                          <td className="px-2 py-1.5">
                            {row.product_id
                              ? <span className="font-mono text-brand-700">{row.product_id}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-right">{row.qty ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-1.5 text-gray-500">{row.unit ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <button type="button" className="text-brand-600 hover:underline mr-1" onClick={() => setEditIdx(idx)}>Modifica</button>
                            <button type="button" className="text-red-500 hover:underline" onClick={() => deleteRow(idx)}>Elimina</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {localRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">Nessuno step. Usa "+ Step" per aggiungerne uno.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
