import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, BookOpen, Clock } from 'lucide-react';
import { useAdminStore } from '../../store/admin-store';
import type { StratigraphyManual, StratigraphyPhase, StratigraphyPhaseLabel, StratigraphyVersion } from '../../types/cms';

const PHASE_COLORS: Record<StratigraphyPhaseLabel, string> = {
  A: '#d4c4a8',
  B: '#8fa89a',
  C: '#b8c4c2',
};

const PHASE_LABELS: Record<StratigraphyPhaseLabel, string> = {
  A: 'Preparazione',
  B: 'Texture',
  C: 'Protezione',
};

export function AdminStratigraphyManual() {
  const { cms, saveCMS } = useAdminStore(s => ({ cms: s.cms, saveCMS: s.saveCMS }));
  const [manuals, setManuals] = useState<StratigraphyManual[]>(() => cms.stratigraphyManuals ?? []);
  const [versions, setVersions] = useState<StratigraphyVersion[]>(() => cms.stratigraphyVersions ?? []);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<StratigraphyManual>>({});
  const [showVersions, setShowVersions] = useState<string | null>(null);

  useEffect(() => {
    setManuals(cms.stratigraphyManuals ?? []);
    setVersions(cms.stratigraphyVersions ?? []);
  }, [cms.stratigraphyManuals, cms.stratigraphyVersions]);

  function startNew() {
    const id = crypto.randomUUID();
    setEditId(id);
    setDraft({ id, name: '', support_id: '', texture_system: '', environment_type: '', media_ids: [], phases: [] });
  }

  function startEdit(m: StratigraphyManual) {
    setEditId(m.id);
    setDraft({ ...m, phases: m.phases.map(p => ({ ...p, product_ids: [...p.product_ids] })) });
  }

  function commit() {
    if (!draft.id || !draft.name?.trim()) return;
    const manual: StratigraphyManual = {
      id: draft.id!,
      name: draft.name!,
      support_id: draft.support_id ?? '',
      texture_system: draft.texture_system ?? '',
      environment_type: draft.environment_type ?? '',
      media_ids: draft.media_ids ?? [],
      phases: draft.phases ?? [],
    };
    const updated = manuals.some(m => m.id === manual.id)
      ? manuals.map(m => m.id === manual.id ? manual : m)
      : [...manuals, manual];
    setManuals(updated);
    saveCMS({ stratigraphyManuals: updated });
    setEditId(null);
    setDraft({});
  }

  function remove(id: string) {
    const updated = manuals.filter(m => m.id !== id);
    setManuals(updated);
    saveCMS({ stratigraphyManuals: updated });
  }

  function createVersion(manual: StratigraphyManual, notes: string) {
    const v: StratigraphyVersion = {
      id: crypto.randomUUID(),
      manual_id: manual.id,
      version: `v${(versions.filter(v => v.manual_id === manual.id).length + 1).toString().padStart(2, '0')}`,
      snapshot: { ...manual },
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      notes,
    };
    const updated = [...versions, v];
    setVersions(updated);
    saveCMS({ stratigraphyVersions: updated });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8c9aaa' }}>{manuals.length} manuali · {versions.length} versioni archiviate</span>
        <button type="button" className="btn-secondary text-xs" onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} /> Nuovo manuale
        </button>
      </div>

      {editId && !manuals.some(m => m.id === editId) && (
        <ManualEditBlock draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {manuals.map(manual =>
          editId === manual.id ? (
            <ManualEditBlock key={manual.id} draft={draft} onChange={setDraft} onCommit={commit} onCancel={() => { setEditId(null); setDraft({}); }} />
          ) : (
            <ManualCard
              key={manual.id}
              manual={manual}
              versions={versions.filter(v => v.manual_id === manual.id)}
              showVersions={showVersions === manual.id}
              onToggleVersions={() => setShowVersions(showVersions === manual.id ? null : manual.id)}
              onEdit={() => startEdit(manual)}
              onDelete={() => remove(manual.id)}
              onSaveVersion={(notes) => createVersion(manual, notes)}
            />
          )
        )}
      </div>
    </div>
  );
}

function ManualCard({
  manual,
  versions,
  showVersions,
  onToggleVersions,
  onEdit,
  onDelete,
  onSaveVersion,
}: {
  manual: StratigraphyManual;
  versions: StratigraphyVersion[];
  showVersions: boolean;
  onToggleVersions: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveVersion: (notes: string) => void;
}) {
  const [versionNotes, setVersionNotes] = useState('');
  const [showVersionForm, setShowVersionForm] = useState(false);

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e4e0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#171e29', margin: 0 }}>{manual.name}</p>
          <div style={{ fontSize: 11, color: '#8c9aaa', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {manual.support_id && <span>Supporto: <b>{manual.support_id}</b></span>}
            {manual.texture_system && <span>Sistema: <b>{manual.texture_system}</b></span>}
            {manual.environment_type && <span>Ambiente: <b>{manual.environment_type}</b></span>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {manual.phases.map(ph => (
              <span key={ph.id} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: PHASE_COLORS[ph.phase], color: '#171e29' }}>
                Fase {ph.phase} — {PHASE_LABELS[ph.phase]}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button type="button" className="btn-secondary text-xs" onClick={onToggleVersions} style={{ display: 'flex', gap: 4 }}><Clock size={11} /> {versions.length}</button>
          <button type="button" className="btn-secondary text-xs" onClick={() => setShowVersionForm(f => !f)} style={{ display: 'flex', gap: 4 }}><BookOpen size={11} /></button>
          <button type="button" className="btn-secondary text-xs" onClick={onEdit} style={{ display: 'flex', gap: 4 }}><Pencil size={11} /></button>
          <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c94040' }}><Trash2 size={13} /></button>
        </div>
      </div>

      {showVersionForm && (
        <div style={{ borderTop: '1px solid #f0f0ee', padding: '10px 16px', background: '#fafaf8', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Note versione…"
            value={versionNotes}
            onChange={e => setVersionNotes(e.target.value)}
            className="input-field"
            style={{ flex: 1, fontSize: 12 }}
          />
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => { onSaveVersion(versionNotes); setVersionNotes(''); setShowVersionForm(false); }}
          >
            Archivia versione
          </button>
        </div>
      )}

      {showVersions && versions.length > 0 && (
        <div style={{ borderTop: '1px solid #f0f0ee', padding: '10px 16px', background: '#fafaf8' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#445164', marginBottom: 8 }}>Versioni archiviate</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {versions.map(v => (
              <div key={v.id} style={{ display: 'flex', gap: 10, fontSize: 11, color: '#8c9aaa', alignItems: 'center' }}>
                <code style={{ fontWeight: 700, color: '#445164' }}>{v.version}</code>
                <span>{new Date(v.createdAt).toLocaleDateString('it-IT')}</span>
                {v.notes && <span>— {v.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualEditBlock({
  draft,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: Partial<StratigraphyManual>;
  onChange: (d: Partial<StratigraphyManual>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  function updatePhase(phId: string, field: keyof StratigraphyPhase, value: unknown) {
    const phases = (draft.phases ?? []).map(p =>
      p.id === phId ? { ...p, [field]: value } : p
    );
    onChange({ ...draft, phases });
  }

  function addPhase(label: StratigraphyPhaseLabel) {
    const exists = (draft.phases ?? []).some(p => p.phase === label);
    if (exists) return;
    const ph: StratigraphyPhase = {
      id: crypto.randomUUID(),
      phase: label,
      label: PHASE_LABELS[label],
      product_ids: [],
    };
    onChange({ ...draft, phases: [...(draft.phases ?? []), ph].sort((a, b) => a.phase.localeCompare(b.phase)) });
  }

  function removePhase(phId: string) {
    onChange({ ...draft, phases: (draft.phases ?? []).filter(p => p.id !== phId) });
  }

  return (
    <div style={{ background: '#f8f9f7', border: '1px solid #c8cac6', borderRadius: 8, padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {(['name', 'support_id', 'texture_system', 'environment_type'] as const).map(key => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#445164', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {key === 'name' ? 'Nome manuale' : key === 'support_id' ? 'Support ID' : key === 'texture_system' ? 'Sistema texture' : 'Tipo ambiente'}
            </label>
            <input
              type="text"
              value={(draft[key] as string) ?? ''}
              onChange={e => onChange({ ...draft, [key]: e.target.value })}
              className="input-field"
              style={{ fontSize: 12 }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#445164', marginBottom: 8 }}>Fasi ({(['A', 'B', 'C'] as StratigraphyPhaseLabel[]).map(l => (
          <button key={l} type="button" onClick={() => addPhase(l)} style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 3, background: PHASE_COLORS[l], border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Fase {l}</button>
        ))})</p>
        {(draft.phases ?? []).map(ph => (
          <div key={ph.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: PHASE_COLORS[ph.phase], color: '#171e29', whiteSpace: 'nowrap', marginTop: 4 }}>Fase {ph.phase}</span>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Product IDs separati da virgola (es. PR_SW, RAS_BASE_Q)"
                value={ph.product_ids.join(', ')}
                onChange={e => updatePhase(ph.id, 'product_ids', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="input-field"
                style={{ fontSize: 12, width: '100%' }}
              />
            </div>
            <button type="button" onClick={() => removePhase(ph.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c94040', marginTop: 4 }}><X size={13} /></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-primary text-xs" onClick={onCommit} style={{ display: 'flex', gap: 4 }}><Check size={12} /> Salva manuale</button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}><X size={12} /></button>
      </div>
    </div>
  );
}
