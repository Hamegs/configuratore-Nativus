import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Layers, FileText } from 'lucide-react';
import { useProjectStore } from '../store/project-store';
import { useAdminStore } from '../store/admin-store';
import { ROOM_TYPES } from '../types/project';
import { buildStratigraphyDocument, findStratigraphyMediaConfig } from '../services/stratigraphy-builder';
import { getMediaBlob } from '../store/media-store';
import { OperationalSheetView } from '../components/stratigraphy/OperationalSheetView';
import type { OperationalAudience } from '../types/cms';
import type { StratigraphyDocument, PhaseLabel } from '../services/stratigraphy-builder';

type DocTab = 'stratigrafia' | 'applicatore' | 'distributore' | 'progettista';

const TABS: { id: DocTab; label: string; audience?: OperationalAudience }[] = [
  { id: 'stratigrafia', label: 'Stratigrafia' },
  { id: 'applicatore', label: 'Scheda Applicatore', audience: 'APPLICATORE' },
  { id: 'distributore', label: 'Scheda Distributore', audience: 'DISTRIBUTORE' },
  { id: 'progettista', label: 'Scheda Progettista', audience: 'PROGETTISTA' },
];

const PHASE_META: Record<PhaseLabel, { label: string; bg: string; border: string; num: string }> = {
  A: { label: 'Preparazione', bg: '#f5f0e8', border: '#d4c4a8', num: 'A' },
  B: { label: 'Texture',      bg: '#eef2ef', border: '#8fa89a', num: 'B' },
  C: { label: 'Protezione',   bg: '#eef1f0', border: '#b8c4c2', num: 'C' },
};

export function DocumentsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const rooms = useProjectStore(s => s.rooms);
  const { cms } = useAdminStore(s => ({ cms: s.cms }));

  const [activeTab, setActiveTab] = useState<DocTab>('stratigrafia');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const room = rooms.find(r => r.id === roomId);

  useEffect(() => {
    if (!room) navigate('/progetto');
  }, [room, navigate]);

  const wizState = room?.wizard_state;
  const cartResult = room?.cart_result ?? null;
  const cartLines = room?.cart_lines ?? [];

  const supportId = wizState?.supporto_floor ?? wizState?.supporto_wall ?? null;
  const textureLine = wizState?.texture_line ?? wizState?.surfaces?.[0]?.texture_line ?? null;
  const environmentType = wizState?.ambiente ?? null;

  const doc = useMemo<StratigraphyDocument | null>(() => {
    if (!cartResult && !cartLines.length) return null;
    return buildStratigraphyDocument(cartResult, cartLines, cms, {
      supportId: supportId ?? undefined,
      textureLine: textureLine ?? undefined,
      environmentType: environmentType ?? undefined,
    });
  }, [cartResult, cartLines, cms, supportId, textureLine, environmentType]);

  useEffect(() => {
    if (!doc) return;
    const mediaConfig = findStratigraphyMediaConfig(cms, supportId, textureLine, environmentType);
    if (!mediaConfig) { setMediaUrls([]); return; }
    Promise.all(
      mediaConfig.media_ids.map(id => getMediaBlob('stratigraphies', id))
    ).then(urls => setMediaUrls(urls.filter(Boolean) as string[]));
  }, [doc, cms, supportId, textureLine, environmentType]);

  if (!room) return null;

  const roomLabel = room.custom_name ||
    (ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? 'Ambiente');

  const activeAudience = TABS.find(t => t.id === activeTab)?.audience;

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f0' }}>
      {/* Header */}
      <div style={{ background: '#171e29', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={() => navigate('/progetto')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <ArrowLeft size={13} /> Progetto
          </button>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{roomLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Documenti</span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}
        >
          <Printer size={13} /> Stampa / PDF
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e4e0', padding: '0 40px', display: 'flex', gap: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 20px',
              fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#171e29' : '#8c9aaa',
              borderBottom: activeTab === tab.id ? '2px solid #171e29' : '2px solid transparent',
              background: 'none', border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.id ? '#171e29' : 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {tab.id === 'stratigrafia' ? <Layers size={12} /> : <FileText size={12} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 40px' }}>
        {activeTab === 'stratigrafia' && doc && (
          <StratigraphyPanel doc={doc} mediaUrls={mediaUrls} roomLabel={roomLabel} />
        )}
        {activeTab === 'stratigrafia' && !doc && (
          <EmptyState message="Configura l'ambiente per visualizzare la stratigrafia." />
        )}
        {activeAudience && (
          <OperationalSheetView
            audience={activeAudience}
            cartResult={cartResult}
            cartLines={cartLines}
            projectName="Progetto Nativus"
            roomName={roomLabel}
          />
        )}
      </div>

      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <Layers size={32} style={{ margin: '0 auto 12px', color: '#b0b8c4' }} />
      <p style={{ fontSize: 13, color: '#8c9aaa' }}>{message}</p>
    </div>
  );
}

function StratigraphyPanel({
  doc,
  mediaUrls,
  roomLabel,
}: {
  doc: StratigraphyDocument;
  mediaUrls: string[];
  roomLabel: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8c9aaa', margin: '0 0 4px' }}>
          Stratigrafia sistema
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 300, color: '#171e29', margin: 0, letterSpacing: '0.03em' }}>
          {roomLabel}
        </h2>
        {(doc.support_id || doc.texture_line) && (
          <p style={{ fontSize: 12, color: '#445164', marginTop: 4 }}>
            {[doc.support_id, doc.texture_line].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* CMS stratigraphy images */}
      {mediaUrls.length > 0 && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {mediaUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="Diagramma stratigrafico"
              style={{ height: 160, maxWidth: 280, borderRadius: 6, border: '1px solid #e2e4e0', objectFit: 'contain', background: '#fff', flexShrink: 0 }}
            />
          ))}
        </div>
      )}

      {/* Phase layers — rendered C→B→A top to bottom (as built) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(['C', 'B', 'A'] as PhaseLabel[]).map(phase => {
          const phaseLayers = doc.phases[phase];
          if (!phaseLayers.length) return null;
          const meta = PHASE_META[phase];
          return (
            <div key={phase} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: meta.border, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                }}>
                  {meta.num}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#171e29', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {meta.label}
                </span>
              </div>
              {phaseLayers.map((layer, idx) => (
                <div
                  key={`${layer.product_id ?? layer.name}::${idx}`}
                  style={{
                    background: meta.bg,
                    borderLeft: `3px solid ${meta.border}`,
                    padding: '10px 16px',
                    marginBottom: 3,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#171e29' }}>{layer.name}</span>
                      {layer.product_id && (
                        <code style={{ fontSize: 9, color: '#8c9aaa', background: 'rgba(0,0,0,0.04)', padding: '1px 5px', borderRadius: 2 }}>
                          {layer.product_id}
                        </code>
                      )}
                    </div>
                    {(layer.tool_names.length > 0 || layer.cleaning_method || layer.technical_notes) && (
                      <div style={{ marginTop: 5, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#445164' }}>
                        {layer.tool_names.length > 0 && (
                          <span>Strumenti: <b>{layer.tool_names.join(', ')}</b></span>
                        )}
                        {layer.cleaning_method && (
                          <span>Pulizia: {layer.cleaning_method}</span>
                        )}
                        {layer.technical_notes && (
                          <span style={{ color: '#8c9aaa' }}>{layer.technical_notes}</span>
                        )}
                      </div>
                    )}
                    {layer.diluizione && (
                      <p style={{ fontSize: 10, color: '#8c9aaa', marginTop: 3 }}>Diluizione: {layer.diluizione}</p>
                    )}
                    {layer.hard_alerts.map((alert, ai) => (
                      <p key={ai} style={{ fontSize: 10, color: '#c94040', marginTop: 2, fontWeight: 600 }}>⚠ {alert}</p>
                    ))}
                  </div>
                  {layer.qty_display && (
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#445164' }}>{layer.qty_display}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {/* Substrate base */}
        <div style={{
          padding: '8px 16px', background: '#e8eae6', borderLeft: '3px solid #b0b8c4',
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#445164', fontWeight: 600 }}>Supporto / Substrato</span>
          {doc.support_id && (
            <code style={{ fontSize: 10, color: '#8c9aaa', marginLeft: 10 }}>{doc.support_id}</code>
          )}
        </div>
      </div>

      {/* Layer count summary */}
      <div style={{ borderTop: '1px solid #e8eae6', paddingTop: 12, display: 'flex', gap: 20, fontSize: 11, color: '#8c9aaa' }}>
        <span>Fase A: {doc.phases.A.length} strati</span>
        <span>Fase B: {doc.phases.B.length} strati</span>
        <span>Fase C: {doc.phases.C.length} strati</span>
        <span>Totale: {doc.layers.length} strati</span>
      </div>
    </div>
  );
}
