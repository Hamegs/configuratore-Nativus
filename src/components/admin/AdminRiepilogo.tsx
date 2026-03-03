import React, { useState, useMemo } from 'react';
import type { DataStore } from '../../utils/data-loader';
import { useAdminStore, type AdminStore } from '../../store/admin-store';

interface Props {
  store: DataStore;
  onNavigateTab: (tab: string) => void;
}

type SectionId =
  | 'ambienti' | 'supporti' | 'textureLines' | 'textureStyles' | 'laminePatterns'
  | 'dinInputs' | 'dinOrderRules'
  | 'colorRal' | 'colorNcs' | 'colorPantone'
  | 'decisionTable' | 'stepMap';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  readOnly?: boolean;
  wide?: boolean;
}

const SECTION_FIELDS: Record<string, { idKey: string; fields: FieldConfig[] }> = {
  ambienti: {
    idKey: 'env_id',
    fields: [
      { key: 'env_id', label: 'ID ambiente', type: 'text', readOnly: true },
      { key: 'name', label: 'Nome visualizzato', type: 'text' },
      { key: 'engine_id', label: 'Engine ID', type: 'text' },
    ],
  },
  supporti: {
    idKey: 'support_id',
    fields: [
      { key: 'support_id', label: 'Support ID', type: 'text', readOnly: true },
      { key: 'macro_id', label: 'Macro (FLOOR/WALL)', type: 'text', readOnly: true },
      { key: 'name', label: 'Nome visualizzato', type: 'text', wide: true },
    ],
  },
  textureLines: {
    idKey: 'line_id',
    fields: [
      { key: 'line_id', label: 'Line ID', type: 'text', readOnly: true },
      { key: 'name', label: 'Nome', type: 'text' },
      { key: 'notes', label: 'Note', type: 'text', wide: true },
    ],
  },
  textureStyles: {
    idKey: 'style_id',
    fields: [
      { key: 'style_id', label: 'Style ID', type: 'text', readOnly: true },
      { key: 'name', label: 'Nome', type: 'text', wide: true },
      { key: 'passes_total', label: 'Passaggi', type: 'number' },
      { key: 'color_roles', label: 'Color roles', type: 'text', wide: true },
      { key: 'rules', label: 'Regole', type: 'text', wide: true },
    ],
  },
  laminePatterns: {
    idKey: 'pattern_id',
    fields: [
      { key: 'pattern_id', label: 'Pattern ID', type: 'text', readOnly: true },
      { key: 'name', label: 'Nome', type: 'text', wide: true },
    ],
  },
  dinInputs: {
    idKey: 'input_id',
    fields: [
      { key: 'input_id', label: 'Input ID', type: 'text', readOnly: true },
      { key: 'label', label: 'Etichetta', type: 'text' },
      { key: 'driver', label: 'Driver', type: 'text', readOnly: true },
      { key: 'unit', label: 'Unità', type: 'text' },
      { key: 'default', label: 'Default', type: 'number' },
      { key: 'required', label: 'Obbligatorio', type: 'boolean' },
    ],
  },
  dinOrderRules: {
    idKey: 'rule_id',
    fields: [
      { key: 'rule_id', label: 'Rule ID', type: 'text', readOnly: true },
      { key: 'applies_if', label: 'Applica se', type: 'text', readOnly: true },
      { key: 'product_id', label: 'Product ID', type: 'text', readOnly: true },
      { key: 'calc', label: 'Formula calcolo', type: 'text', wide: true },
      { key: 'notes', label: 'Note', type: 'text', wide: true },
    ],
  },
};

function getSectionData(sectionId: SectionId, store: DataStore, overrides: Record<string, Array<Record<string, unknown>>>): Array<Record<string, unknown>> {
  const key = sectionId as keyof typeof overrides;
  if (overrides[key]) return overrides[key];
  switch (sectionId) {
    case 'ambienti': return store.ambienti as unknown as Array<Record<string, unknown>>;
    case 'supporti': return store.supporti as unknown as Array<Record<string, unknown>>;
    case 'textureLines': return store.textureLines as unknown as Array<Record<string, unknown>>;
    case 'textureStyles': return store.textureStyles as unknown as Array<Record<string, unknown>>;
    case 'laminePatterns': return store.laminePatterns as unknown as Array<Record<string, unknown>>;
    case 'dinInputs': return store.dinInputs as unknown as Array<Record<string, unknown>>;
    case 'dinOrderRules': return store.dinOrderRules as unknown as Array<Record<string, unknown>>;
    case 'decisionTable': return store.decisionTable as unknown as Array<Record<string, unknown>>;
    case 'stepMap': return store.stepMap as unknown as Array<Record<string, unknown>>;
    default: return [];
  }
}

function getSectionSaveAction(sectionId: SectionId, adminStore: AdminStore) {
  switch (sectionId) {
    case 'ambienti': return adminStore.saveAmbienti;
    case 'supporti': return adminStore.saveSupporti;
    case 'textureLines': return adminStore.saveTextureLines;
    case 'textureStyles': return adminStore.saveTextureStyles;
    case 'laminePatterns': return adminStore.saveLaminePatterns;
    case 'dinInputs': return adminStore.saveDinInputs;
    case 'dinOrderRules': return adminStore.saveDinOrderRules;
    default: return null;
  }
}

interface DataTableEditorProps {
  data: Array<Record<string, unknown>>;
  idKey: string;
  fields: FieldConfig[];
  readOnly?: boolean;
  onSave: (updated: Array<Record<string, unknown>>) => void;
}

function DataTableEditor({ data, idKey, fields, readOnly, onSave }: DataTableEditorProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      fields.some(f => String(row[f.key] ?? '').toLowerCase().includes(q))
    );
  }, [data, fields, search]);

  function startEdit(row: Record<string, unknown>) {
    setEditId(row[idKey] as string);
    setEditValues({ ...row });
  }

  function saveRow() {
    const updated = data.map(row =>
      row[idKey] === editId ? { ...row, ...editValues } : row
    );
    onSave(updated);
    setEditId(null);
    setEditValues({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Filtra..."
          className="input-field max-w-xs text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {saved && <span className="text-xs text-green-600 font-medium">Salvato</span>}
        {readOnly && <span className="text-xs text-gray-400 italic">Sola lettura — dati di sistema</span>}
      </div>
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {fields.map(f => (
                  <th key={f.key} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{f.label}</th>
                ))}
                {!readOnly && <th className="px-3 py-2 text-left font-medium text-gray-500"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const id = row[idKey] as string;
                const isEditing = editId === id;
                return (
                  <tr key={id ?? idx} className="border-b border-gray-50 hover:bg-gray-50">
                    {fields.map(field => (
                      <td key={field.key} className={`px-2 py-1.5 ${field.readOnly ? 'text-gray-400 font-mono' : 'text-gray-800'}`}>
                        {isEditing && !field.readOnly ? (
                          field.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={!!editValues[field.key]}
                              onChange={e => setEditValues(v => ({ ...v, [field.key]: e.target.checked }))}
                              className="w-4 h-4"
                            />
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              step={field.type === 'number' ? 'any' : undefined}
                              className={`input-field text-xs py-0.5 ${field.wide ? 'min-w-[200px]' : 'min-w-[80px]'}`}
                              value={String(editValues[field.key] ?? '')}
                              onChange={e => setEditValues(v => ({
                                ...v,
                                [field.key]: field.type === 'number'
                                  ? (e.target.value === '' ? null : parseFloat(e.target.value))
                                  : e.target.value,
                              }))}
                            />
                          )
                        ) : (
                          <span className={field.type === 'boolean' ? '' : 'truncate block max-w-[200px]'}>
                            {field.type === 'boolean'
                              ? (row[field.key] ? '✓' : '—')
                              : String(row[field.key] ?? '—')}
                          </span>
                        )}
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {isEditing ? (
                          <span className="flex gap-1">
                            <button type="button" className="btn-primary text-xs py-0.5 px-2" onClick={saveRow}>Salva</button>
                            <button type="button" className="btn-secondary text-xs py-0.5 px-2" onClick={() => setEditId(null)}>Annulla</button>
                          </span>
                        ) : (
                          <button type="button" className="text-brand-600 hover:underline text-xs" onClick={() => startEdit(row)}>
                            Modifica
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 1} className="px-3 py-4 text-center text-gray-400">Nessun risultato</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length < data.length && (
        <p className="text-xs text-gray-400">Mostro {filtered.length} di {data.length} righe</p>
      )}
    </div>
  );
}

interface ColorEditorProps {
  colors: Array<Record<string, unknown>>;
  idKey: string;
  codeKey: string;
  labelKey: string;
  colorOverrides: Record<string, { is_active?: boolean; label?: string }>;
  onSave: (overrides: Record<string, { is_active?: boolean; label?: string }>) => void;
}

function ColorEditor({ colors, idKey, codeKey, labelKey, colorOverrides, onSave }: ColorEditorProps) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [saved, setSaved] = useState(false);

  const displayed = useMemo(() => {
    let result = colors.map(c => {
      const id = c[idKey] as string;
      const ov = colorOverrides[id];
      return ov ? { ...c, ...ov } : c;
    });
    if (!showAll) result = result.filter(c => c.is_active !== false);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        String(c[codeKey] ?? '').toLowerCase().includes(q) ||
        String(c[labelKey] ?? '').toLowerCase().includes(q)
      );
    }
    return result.slice(0, 200);
  }, [colors, colorOverrides, search, showAll, idKey, codeKey, labelKey]);

  const activeCount = useMemo(() => {
    return colors.filter(c => {
      const id = c[idKey] as string;
      const ov = colorOverrides[id];
      if (ov?.is_active !== undefined) return ov.is_active;
      return c.is_active !== false;
    }).length;
  }, [colors, colorOverrides, idKey]);

  function toggleActive(id: string, currentActive: boolean) {
    const updated = { ...colorOverrides, [id]: { ...(colorOverrides[id] ?? {}), is_active: !currentActive } };
    onSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function saveLabel(id: string) {
    const updated = { ...colorOverrides, [id]: { ...(colorOverrides[id] ?? {}), label: editLabel } };
    onSave(updated);
    setEditId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Cerca codice o etichetta..."
          className="input-field max-w-xs text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="w-3.5 h-3.5" />
          Mostra anche inattivi
        </label>
        {saved && <span className="text-xs text-green-600 font-medium">Salvato</span>}
        <span className="text-xs text-gray-400 ml-auto">{activeCount} attivi / {colors.length} totali</span>
      </div>
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Codice</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Etichetta</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Attivo</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(c => {
                const id = c[idKey] as string;
                const isActive = c.is_active !== false;
                const isEditing = editId === id;
                const ov = colorOverrides[id];
                const isModified = !!ov;
                return (
                  <tr key={id} className={`border-b border-gray-50 hover:bg-gray-50 ${!isActive ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-1.5 font-mono text-gray-600 whitespace-nowrap">
                      {String(c[codeKey])}
                      {isModified && <span className="ml-1 text-amber-500 text-xs">●</span>}
                    </td>
                    <td className="px-3 py-1.5 text-gray-700">
                      {isEditing ? (
                        <input
                          type="text"
                          className="input-field text-xs py-0.5 w-48"
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveLabel(id); if (e.key === 'Escape') setEditId(null); }}
                          autoFocus
                        />
                      ) : (
                        String(c[labelKey] ?? '—')
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleActive(id, isActive)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {isEditing ? (
                        <span className="flex gap-1">
                          <button type="button" className="btn-primary text-xs py-0.5 px-2" onClick={() => saveLabel(id)}>Salva</button>
                          <button type="button" className="btn-secondary text-xs py-0.5 px-2" onClick={() => setEditId(null)}>Annulla</button>
                        </span>
                      ) : (
                        <button type="button" className="text-brand-600 hover:underline text-xs" onClick={() => { setEditId(id); setEditLabel(String(c[labelKey] ?? '')); }}>
                          Modifica
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {displayed.length >= 200 && (
        <p className="text-xs text-gray-400">Mostro max 200 risultati — usa la ricerca per filtrare</p>
      )}
    </div>
  );
}

const STAT_CARDS: Array<{
  label: string;
  storeKey: keyof DataStore;
  section: SectionId | null;
  tab?: string;
  color: string;
}> = [
  { label: 'Ambienti', storeKey: 'ambienti', section: 'ambienti', color: 'text-brand-700' },
  { label: 'Supporti', storeKey: 'supporti', section: 'supporti', color: 'text-brand-700' },
  { label: 'Regole DT', storeKey: 'decisionTable', section: 'decisionTable', color: 'text-gray-600' },
  { label: 'Step-map', storeKey: 'stepMap', section: 'stepMap', color: 'text-gray-600' },
  { label: 'Step library', storeKey: 'stepLibrary', section: null, tab: 'stratigrafie', color: 'text-green-700' },
  { label: 'SKU packaging', storeKey: 'packagingSku', section: null, tab: 'listino', color: 'text-blue-700' },
  { label: 'SKU listino', storeKey: 'listino', section: null, tab: 'listino', color: 'text-blue-700' },
  { label: 'Texture lines', storeKey: 'textureLines', section: 'textureLines', color: 'text-brand-700' },
  { label: 'Texture styles', storeKey: 'textureStyles', section: 'textureStyles', color: 'text-brand-700' },
  { label: 'LAMINE pattern', storeKey: 'laminePatterns', section: 'laminePatterns', color: 'text-brand-700' },
  { label: 'DIN inputs', storeKey: 'dinInputs', section: 'dinInputs', color: 'text-brand-700' },
  { label: 'DIN order rules', storeKey: 'dinOrderRules', section: 'dinOrderRules', color: 'text-brand-700' },
  { label: 'RAL Classic', storeKey: 'colorRal', section: 'colorRal', color: 'text-purple-700' },
  { label: 'NCS', storeKey: 'colorNcs', section: 'colorNcs', color: 'text-purple-700' },
  { label: 'Pantone C', storeKey: 'colorPantone', section: 'colorPantone', color: 'text-purple-700' },
];

const SECTION_LABELS: Record<string, string> = {
  ambienti: 'Ambienti',
  supporti: 'Supporti',
  textureLines: 'Texture Lines',
  textureStyles: 'Texture Styles',
  laminePatterns: 'LAMINE Patterns',
  dinInputs: 'DIN Inputs',
  dinOrderRules: 'DIN Order Rules',
  colorRal: 'Colori RAL Classic',
  colorNcs: 'Colori NCS',
  colorPantone: 'Colori Pantone C',
  decisionTable: 'Regole Decision Table',
  stepMap: 'Step Map',
};

export function AdminRiepilogo({ store, onNavigateTab }: Props) {
  const adminStore = useAdminStore();
  const { overrides } = adminStore;

  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  function handleCardClick(card: (typeof STAT_CARDS)[number]) {
    if (card.tab) {
      onNavigateTab(card.tab);
    } else if (card.section) {
      setActiveSection(card.section);
    }
  }

  const colorOverrides = overrides.colorOverrides ?? {};

  function renderSectionEditor(section: SectionId) {
    const config = SECTION_FIELDS[section];

    if (section === 'colorRal') {
      return (
        <ColorEditor
          colors={store.colorRal as unknown as Array<Record<string, unknown>>}
          idKey="ral_id"
          codeKey="ral_code"
          labelKey="ral_label"
          colorOverrides={colorOverrides}
          onSave={adminStore.saveColorOverrides}
        />
      );
    }

    if (section === 'colorNcs') {
      return (
        <ColorEditor
          colors={store.colorNcs as unknown as Array<Record<string, unknown>>}
          idKey="ncs_id"
          codeKey="ncs_code"
          labelKey="ncs_label"
          colorOverrides={colorOverrides}
          onSave={adminStore.saveColorOverrides}
        />
      );
    }

    if (section === 'colorPantone') {
      return (
        <ColorEditor
          colors={store.colorPantone as unknown as Array<Record<string, unknown>>}
          idKey="pantone_id"
          codeKey="pantone_code"
          labelKey="pantone_label"
          colorOverrides={colorOverrides}
          onSave={adminStore.saveColorOverrides}
        />
      );
    }

    if (section === 'decisionTable' || section === 'stepMap') {
      const data = getSectionData(section, store, overrides as Record<string, Array<Record<string, unknown>>>);
      const readOnlyFields: FieldConfig[] = Object.keys(data[0] ?? {}).map(k => ({
        key: k, label: k, type: 'text', readOnly: true,
      }));
      return (
        <DataTableEditor
          data={data}
          idKey={section === 'decisionTable' ? 'rule_id' : 'rule_id'}
          fields={readOnlyFields.slice(0, 6)}
          readOnly
          onSave={() => {}}
        />
      );
    }

    if (!config) return <p className="text-sm text-gray-400">Sezione non configurata.</p>;

    const data = getSectionData(section, store, overrides as Record<string, Array<Record<string, unknown>>>);
    const saveAction = getSectionSaveAction(section, adminStore);

    return (
      <DataTableEditor
        data={data}
        idKey={config.idKey}
        fields={config.fields}
        readOnly={!saveAction}
        onSave={saveAction ?? (() => {})}
      />
    );
  }

  return (
    <div className="space-y-6">
      {activeSection ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1.5"
              onClick={() => setActiveSection(null)}
            >
              ← Riepilogo
            </button>
            <h2 className="text-base font-bold text-gray-900">{SECTION_LABELS[activeSection]}</h2>
            {(activeSection === 'decisionTable' || activeSection === 'stepMap') && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                Sola lettura — dati di sistema complessi
              </span>
            )}
          </div>
          {renderSectionEditor(activeSection)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STAT_CARDS.map(card => {
            const raw = store[card.storeKey];
            const count = Array.isArray(raw) ? raw.length : 0;
            const isEditable = card.section !== null;
            const goesToTab = !!card.tab;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => handleCardClick(card)}
                className={`card p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-brand-400 ${
                  goesToTab ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' :
                  isEditable ? 'hover:border-brand-300 hover:bg-brand-50 cursor-pointer' :
                  'cursor-pointer'
                }`}
                title={
                  goesToTab ? `Vai alla tab ${card.tab}` :
                  isEditable ? `Modifica ${card.label}` :
                  card.label
                }
              >
                <div className={`text-2xl font-bold ${card.color}`}>{count}</div>
                <div className="text-xs text-gray-500 mt-1">{card.label}</div>
                <div className="text-xs mt-1.5">
                  {goesToTab ? (
                    <span className="text-blue-500">→ {card.tab}</span>
                  ) : (
                    <span className="text-brand-400 opacity-70">Modifica ▸</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
