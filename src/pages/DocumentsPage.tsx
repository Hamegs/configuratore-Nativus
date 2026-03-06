import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText, Layers } from 'lucide-react';
import { useProjectStore } from '../store/project-store';
import { useAdminStore } from '../store/admin-store';
import type { AdminCMS } from '../store/admin-store';
import { ROOM_TYPES } from '../types/project';
import {
  buildStratigraphyDocument,
  findStratigraphyMediaConfig,
} from '../services/stratigraphy-builder';
import type { StratigraphyDocument, StratigraphyLayer, PhaseLabel } from '../services/stratigraphy-builder';
import { getMediaBlob } from '../store/media-store';
import { OperationalSheetView } from '../components/stratigraphy/OperationalSheetView';
import { loadDataStore } from '../utils/data-loader';
import type { OperationalAudience, Tool } from '../types/cms';

// ─── Constants ────────────────────────────────────────────────────────────────
type DocTab = 'manuale' | 'applicatore' | 'distributore' | 'progettista';

const TABS: { id: DocTab; label: string; audience?: OperationalAudience }[] = [
  { id: 'manuale', label: 'Manuale A4' },
  { id: 'applicatore', label: 'Scheda Applicatore', audience: 'APPLICATORE' },
  { id: 'distributore', label: 'Scheda Distributore', audience: 'DISTRIBUTORE' },
  { id: 'progettista', label: 'Scheda Progettista', audience: 'PROGETTISTA' },
];

const PHASE_COLOR: Record<PhaseLabel, string> = {
  A: '#B87B4A',
  B: '#4A8A6A',
  C: '#C04040',
};

const PHASE_LBL: Record<PhaseLabel, string> = {
  A: 'FASE A',
  B: 'FASE B',
  C: 'FASE C',
};

// ─── Hook — async tool icons ──────────────────────────────────────────────────
function useToolIcons(tools: Tool[]): Record<string, string> {
  const [icons, setIcons] = useState<Record<string, string>>({});
  const key = tools.map(t => `${t.id}:${t.icon_media_id}`).join('|');

  useEffect(() => {
    const map: Record<string, string> = {};
    Promise.all(
      tools
        .filter(t => t.icon_media_id)
        .map(async t => {
          const url = await getMediaBlob('tools', t.icon_media_id);
          if (url) map[t.id] = url;
        })
    ).then(() => setIcons({ ...map }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return icons;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function DocumentsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const rooms = useProjectStore(s => s.rooms);
  const { cms } = useAdminStore(s => ({ cms: s.cms }));

  const [activeTab, setActiveTab] = useState<DocTab>('manuale');
  const [illustrationUrls, setIllustrationUrls] = useState<string[]>([]);

  const room = rooms.find(r => r.id === roomId);
  useEffect(() => { if (!room) navigate('/progetto'); }, [room, navigate]);

  const wizState = room?.wizard_state ?? null;
  const cartResult = room?.cart_result ?? null;
  const cartLines = room?.cart_lines ?? [];

  const supportId   = (wizState as Record<string, unknown> | null)?.supporto_floor as string
                   ?? (wizState as Record<string, unknown> | null)?.supporto_wall as string
                   ?? null;
  const textureLine = (wizState as Record<string, unknown> | null)?.texture_line as string ?? null;
  const environmentType = (wizState as Record<string, unknown> | null)?.ambiente as string ?? null;

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
    const cfg = findStratigraphyMediaConfig(cms, supportId, textureLine, environmentType);
    if (!cfg) { setIllustrationUrls([]); return; }
    Promise.all(cfg.media_ids.map(id => getMediaBlob('stratigraphies', id)))
      .then(urls => setIllustrationUrls(urls.filter(Boolean) as string[]));
  }, [doc, cms, supportId, textureLine, environmentType]);

  if (!room) return null;

  const roomLabel = room.custom_name
    || (ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? 'Ambiente');

  const activeAudience = TABS.find(t => t.id === activeTab)?.audience;

  return (
    <div style={{ minHeight: '100vh', background: '#ddddd8' }}>
      {/* Topbar */}
      <div className="no-print" style={{
        background: '#171e29', padding: '13px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={() => navigate('/progetto')} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
          }}>
            <ArrowLeft size={13} /> Progetto
          </button>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{roomLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Documenti</span>
        </div>
        <button type="button" onClick={() => window.print()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', background: 'rgba(255,255,255,0.09)',
          border: '1px solid rgba(255,255,255,0.18)', color: '#fff',
          borderRadius: 4, fontSize: 12, cursor: 'pointer',
        }}>
          <Printer size={13} /> Stampa / PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{
        background: '#fff', borderBottom: '1px solid #e2e4e0',
        padding: '0 40px', display: 'flex',
      }}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{
            padding: '11px 16px', fontSize: 12,
            fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? '#171e29' : '#8c9aaa',
            borderBottom: `2px solid ${activeTab === tab.id ? '#171e29' : 'transparent'}`,
            background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: 2,
            borderBottomColor: activeTab === tab.id ? '#171e29' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}>
            {tab.id === 'manuale' ? <Layers size={12} /> : <FileText size={12} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        padding: activeTab === 'manuale' ? '32px 0' : '32px 40px',
        display: 'flex', justifyContent: 'center',
      }}>
        {activeTab === 'manuale' && doc && (
          <ManualeA4
            doc={doc}
            illustrationUrls={illustrationUrls}
            cms={cms}
            wizState={wizState as Record<string, unknown> | null}
            roomLabel={roomLabel}
          />
        )}
        {activeTab === 'manuale' && !doc && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Layers size={32} style={{ margin: '0 auto 12px', color: '#b0b8c4', display: 'block' }} />
            <p style={{ fontSize: 13, color: '#8c9aaa' }}>
              Configura l'ambiente per generare il manuale stratigrafico.
            </p>
          </div>
        )}
        {activeAudience && (
          <div style={{ width: '100%', maxWidth: 900 }}>
            <OperationalSheetView
              audience={activeAudience}
              cartResult={cartResult}
              cartLines={cartLines}
              projectName="Progetto Nativus"
              roomName={roomLabel}
            />
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .a4-wrap { gap: 0 !important; }
          .a4-page {
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            margin: 0 !important;
          }
          .a4-page:last-child { page-break-after: avoid; break-after: avoid; }
        }
        @page { size: A4 portrait; margin: 0; }
      `}</style>
    </div>
  );
}

// ─── ManualeA4 ────────────────────────────────────────────────────────────────
interface ManualeProps {
  doc: StratigraphyDocument;
  illustrationUrls: string[];
  cms: AdminCMS;
  wizState: Record<string, unknown> | null;
  roomLabel: string;
}

function ManualeA4({ doc, illustrationUrls, cms, wizState, roomLabel }: ManualeProps) {
  const store = useMemo(() => loadDataStore(), []);
  const toolIconMap = useToolIcons(cms.tools);

  const supportId    = (wizState?.supporto_floor ?? wizState?.supporto_wall ?? null) as string | null;
  const textureLineId = (wizState?.texture_line ?? null) as string | null;
  const envId        = (wizState?.ambiente ?? null) as string | null;
  const protFloor    = (wizState?.protettivo_floor ?? wizState?.protettivo ?? null) as string | null;
  const protWall     = (wizState?.protettivo_wall ?? null) as string | null;

  const supportName  = (store.supporti as Array<{ support_id: string; name: string }>).find(s => s.support_id === supportId)?.name ?? supportId ?? '—';
  const textureName  = (store.textureLines as Array<{ line_id: string; name: string }>).find(t => t.line_id === textureLineId)?.name ?? textureLineId ?? '—';
  const envName      = (store.ambienti as Array<{ env_id: string; name: string }>).find(a => a.env_id === envId)?.name ?? envId ?? '—';
  const protLabel    = protFloor && protWall && protFloor !== protWall
    ? `${protFloor} / ${protWall}` : (protFloor ?? protWall ?? '—');

  const allToolIds = useMemo(() => [...new Set(doc.layers.flatMap(l => l.tool_ids))], [doc.layers]);
  const usedTools  = cms.tools.filter(t => allToolIds.includes(t.id));
  const footerInfo = { supportName, roomLabel };

  return (
    <div className="a4-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* PAGE 1 */}
      <A4Page pageNum={1} footer={footerInfo}>
        <Page1Content
          doc={doc}
          illustrationUrls={illustrationUrls}
          supportName={supportName}
          textureName={textureName}
          envName={envName}
          protLabel={protLabel}
          usedTools={usedTools}
          toolIconMap={toolIconMap}
        />
      </A4Page>

      {/* PAGE 2 */}
      <A4Page pageNum={2} footer={footerInfo}>
        <Page2Content doc={doc} cms={cms} toolIconMap={toolIconMap} />
      </A4Page>
    </div>
  );
}

// ─── A4 wrapper ───────────────────────────────────────────────────────────────
function A4Page({
  pageNum,
  footer,
  children,
}: {
  pageNum: number;
  footer: { supportName: string; roomLabel: string };
  children: React.ReactNode;
}) {
  return (
    <div className="a4-page" style={{
      width: '210mm',
      minHeight: '297mm',
      background: '#fff',
      boxShadow: '0 4px 40px rgba(0,0,0,0.18)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Hanken Grotesk", "Inter", sans-serif',
      fontSize: '9pt',
      color: '#171e29',
    }}>
      {/* Header */}
      <div style={{
        padding: '5mm 14mm 3.5mm',
        borderBottom: '0.4pt solid #d4d6d2',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '7pt', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#171e29' }}>
          NATIVUS
        </span>
        <span style={{ fontSize: '7pt', color: '#8c9aaa' }}>{pageNum}</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '5mm 14mm 4mm', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        padding: '3mm 14mm',
        borderTop: '0.4pt solid #d4d6d2',
        display: 'flex', alignItems: 'center', gap: '3mm',
      }}>
        <span style={{ fontSize: '6.5pt', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c9aaa' }}>SUPPORTO</span>
        <span style={{ fontSize: '7.5pt', fontWeight: 500 }}>{footer.supportName}</span>
        <span style={{ marginLeft: 'auto', fontSize: '6.5pt', color: '#a0a8b0' }}>{footer.roomLabel}</span>
      </div>
    </div>
  );
}

// ─── PAGE 1 ───────────────────────────────────────────────────────────────────
function Page1Content({
  doc, illustrationUrls, supportName, textureName, envName, protLabel, usedTools, toolIconMap,
}: {
  doc: StratigraphyDocument;
  illustrationUrls: string[];
  supportName: string;
  textureName: string;
  envName: string;
  protLabel: string;
  usedTools: Tool[];
  toolIconMap: Record<string, string>;
}) {
  const firstImg = illustrationUrls[0] ?? null;

  return (
    <>
      {/* Title */}
      <div style={{ borderBottom: '0.4pt solid #e2e4e0', paddingBottom: '4mm', marginBottom: '4mm' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '7mm', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '20pt', fontWeight: 300, letterSpacing: '-0.01em' }}>
            Sistema {textureName}
          </span>
          <span style={{ fontSize: '20pt', fontWeight: 300, color: '#445164' }}>
            soluzione 1
          </span>
        </div>
      </div>

      {/* Meta strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2mm', borderBottom: '0.4pt solid #e2e4e0',
        paddingBottom: '4mm', marginBottom: '5mm',
      }}>
        {[
          { lbl: 'SUPPORTO', val: supportName },
          { lbl: 'TEXTURE',  val: textureName },
          { lbl: 'PROTETTIVI', val: protLabel },
        ].map(({ lbl, val }) => (
          <div key={lbl}>
            <div style={{ fontSize: '6pt', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c9aaa', marginBottom: '1mm' }}>{lbl}</div>
            <div style={{ fontSize: '9pt', fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '58% 1fr', gap: '7mm' }}>
        {/* Left — Illustration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4mm' }}>
          <div style={{
            flex: 1, minHeight: '95mm',
            border: '0.4pt solid #e2e4e0', borderRadius: '2mm',
            overflow: 'hidden', background: '#f7f5f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {firstImg
              ? <img src={firstImg} alt="Diagramma stratigrafico" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <IllustrationPlaceholder doc={doc} />
            }
          </div>

          {/* Phase legend */}
          <div style={{ display: 'flex', gap: '5mm', alignItems: 'center' }}>
            {(['C', 'B', 'A'] as PhaseLabel[]).map(ph => (
              <div key={ph} style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                <div style={{ width: '2.5mm', height: '2.5mm', borderRadius: '50%', background: PHASE_COLOR[ph] }} />
                <span style={{ fontSize: '6.5pt', color: '#445164', fontWeight: 600 }}>{PHASE_LBL[ph]}</span>
                <span style={{ fontSize: '6pt', color: '#8c9aaa' }}>— {doc.phases[ph].length} {doc.phases[ph].length === 1 ? 'strato' : 'strati'}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '6pt', color: '#a0a8b0', margin: 0, lineHeight: 1.5 }}>
            La stratigrafia rappresenta una delle tipologie di applicazione della texture.
          </p>
        </div>

        {/* Right — Technical panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5mm', borderLeft: '0.4pt solid #e2e4e0', paddingLeft: '6mm' }}>

          <TechSection title="CARATTERISTICHE TECNICHE">
            <div style={{ display: 'flex', gap: '2mm', flexWrap: 'wrap' }}>
              {[
                { lbl: 'Interno', sym: '◻' },
                { lbl: 'Parete', sym: '▣' },
                { lbl: 'Pavimento', sym: '▦' },
                { lbl: 'Bagno', sym: '◈' },
              ].map(({ lbl, sym }) => (
                <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm', width: '11mm' }}>
                  <div style={{
                    width: '8mm', height: '8mm',
                    border: '0.4pt solid #c8cac6', borderRadius: '1mm',
                    background: '#f9f9f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '8pt', color: '#445164' }}>{sym}</span>
                  </div>
                  <span style={{ fontSize: '5pt', color: '#8c9aaa', textAlign: 'center', lineHeight: 1.2 }}>{lbl}</span>
                </div>
              ))}
            </div>
          </TechSection>

          <TechSection title="CAMPI DI IMPIEGO">
            <p style={{ fontSize: '8pt', margin: '0 0 2mm', fontWeight: 500 }}>{envName}</p>
            <div style={{ display: 'flex', gap: '1.5mm', flexWrap: 'wrap' }}>
              {(['C', 'B', 'A'] as PhaseLabel[]).filter(ph => doc.phases[ph].length > 0).map(ph => (
                <span key={ph} style={{
                  fontSize: '6pt', fontWeight: 700, padding: '0.5mm 3mm', borderRadius: '1mm',
                  background: PHASE_COLOR[ph] + '22', color: PHASE_COLOR[ph],
                }}>
                  {ph === 'A' ? 'Preparazione' : ph === 'B' ? textureName ?? 'Texture' : 'Protezione'}
                </span>
              ))}
            </div>
          </TechSection>

          <TechSection title="APPLICAZIONE — STRUMENTI">
            {usedTools.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3mm' }}>
                {usedTools.map(t => (
                  <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm' }}>
                    <div style={{
                      width: '9mm', height: '9mm',
                      border: '0.4pt solid #d4d6d2', borderRadius: '1mm',
                      background: '#f9f9f7', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {toolIconMap[t.id]
                        ? <img src={toolIconMap[t.id]} alt={t.name} style={{ width: '7mm', height: '7mm', objectFit: 'contain' }} />
                        : <span style={{ fontSize: '8pt', color: '#b0b8c4' }}>◈</span>
                      }
                    </div>
                    <span style={{ fontSize: '5pt', color: '#445164', textAlign: 'center', maxWidth: '12mm', lineHeight: 1.2 }}>{t.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '6.5pt', color: '#b0b8c4', margin: 0, fontStyle: 'italic' }}>
                Configura strumenti in Admin → Lavorazioni
              </p>
            )}
          </TechSection>

          <TechSection title="SISTEMA — RIEPILOGO" style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
              <Row6 lbl="Texture" val={textureName ?? '—'} />
              <Row6 lbl="Protezione" val={protLabel} />
              <Row6 lbl="Supporto" val={supportName} />
              <Row6 lbl="Strati totali" val={String(doc.layers.length)} />
            </div>
          </TechSection>
        </div>
      </div>
    </>
  );
}

// ─── PAGE 2 ───────────────────────────────────────────────────────────────────
function Page2Content({
  doc, cms, toolIconMap,
}: {
  doc: StratigraphyDocument;
  cms: AdminCMS;
  toolIconMap: Record<string, string>;
}) {
  const phaseOrder: PhaseLabel[] = ['C', 'B', 'A'];

  const hdr: React.CSSProperties = {
    fontSize: '6.5pt', fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: '#6b7a8a',
    padding: '2.5mm 2mm',
    borderBottom: '1pt solid #c8cac6',
    background: '#f7f7f5',
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '17mm' }} />
          <col style={{ width: '52mm' }} />
          <col style={{ width: '22mm' }} />
          <col style={{ width: '22mm' }} />
          <col />
          <col style={{ width: '20mm' }} />
          <col style={{ width: '14mm' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={hdr}>STRATI</th>
            <th style={hdr}>MATERIALE</th>
            <th style={{ ...hdr, textAlign: 'right' }}>CONSUMO</th>
            <th style={{ ...hdr, textAlign: 'right' }}>ASCIUG.<br />20°C 50%</th>
            <th style={hdr}>STRUMENTI</th>
            <th style={hdr}>ICONE</th>
            <th style={{ ...hdr, textAlign: 'right' }}>VALORE<br />(listino)</th>
          </tr>
        </thead>
        <tbody>
          {phaseOrder.flatMap(phase => {
            const layers = doc.phases[phase];
            if (!layers.length) return [];
            return layers.map((layer, idx) => (
              <StratRow
                key={`${phase}-${layer.name}-${idx}`}
                layer={layer}
                phase={phase}
                isFirst={idx === 0}
                phaseCount={layers.length}
                cms={cms}
                toolIconMap={toolIconMap}
              />
            ));
          })}
          {/* Support row */}
          <tr style={{ background: '#f0f0ee' }}>
            <td colSpan={2} style={{ padding: '2.5mm 2mm', fontSize: '7.5pt', fontWeight: 700, color: '#445164', borderTop: '1pt solid #c8cac6' }}>
              SUPPORTO
            </td>
            <td colSpan={5} style={{ padding: '2.5mm 2mm', fontSize: '7.5pt', color: '#171e29', borderTop: '1pt solid #c8cac6' }}>
              {(doc.support_id) ?? '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Legend */}
      <div style={{ marginTop: 'auto', paddingTop: '6mm', borderTop: '0.4pt solid #e2e4e0', display: 'flex', gap: '8mm', alignItems: 'center' }}>
        {(['C', 'B', 'A'] as PhaseLabel[]).map(ph => (
          <div key={ph} style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
            <div style={{ width: '3mm', height: '8mm', background: PHASE_COLOR[ph], borderRadius: '0.5mm' }} />
            <div>
              <div style={{ fontSize: '6pt', fontWeight: 700, color: PHASE_COLOR[ph], letterSpacing: '0.1em' }}>{PHASE_LBL[ph]}</div>
              <div style={{ fontSize: '6pt', color: '#8c9aaa' }}>
                {ph === 'A' ? 'Preparazione' : ph === 'B' ? 'Texture' : 'Protezione'}
              </div>
            </div>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '6pt', color: '#b0b8c4', fontStyle: 'italic' }}>
          Condizioni standard: 20°C · 50% UR
        </span>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function StratRow({
  layer, phase, isFirst, phaseCount, cms: _cms, toolIconMap,
}: {
  layer: StratigraphyLayer;
  phase: PhaseLabel;
  isFirst: boolean;
  phaseCount: number;
  cms: AdminCMS;
  toolIconMap: Record<string, string>;
}) {
  const cell: React.CSSProperties = {
    padding: '2.5mm 2mm',
    fontSize: '8pt',
    color: '#171e29',
    verticalAlign: 'middle',
    borderBottom: '0.4pt solid #e8eae6',
  };

  const rowBg = isFirst
    ? (phase === 'C' ? 'rgba(192,64,64,0.04)'
      : phase === 'B' ? 'rgba(74,138,106,0.04)'
      : 'rgba(184,123,74,0.04)')
    : '#fff';

  const phaseCell = isFirst ? (
    <td
      rowSpan={phaseCount}
      style={{
        ...cell,
        verticalAlign: 'top',
        paddingTop: '3mm',
        borderRight: `2pt solid ${PHASE_COLOR[phase]}`,
        background: rowBg,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '5.5pt', fontWeight: 800, color: PHASE_COLOR[phase], letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          ↑ {PHASE_LBL[phase]}
        </span>
      </div>
    </td>
  ) : null;

  const iconUrls = layer.tool_ids.map(tid => toolIconMap[tid]).filter(Boolean).slice(0, 3);

  return (
    <tr style={{ background: rowBg }}>
      {phaseCell}
      <td style={{ ...cell, fontWeight: isFirst ? 600 : 400 }}>
        {layer.name}
        {layer.product_id && (
          <div style={{ fontSize: '6pt', color: '#a0a8b0', marginTop: '0.5mm' }}>{layer.product_id}</div>
        )}
      </td>
      <td style={{ ...cell, textAlign: 'right', fontSize: '7.5pt', color: layer.consumption_per_mq ? '#171e29' : '#c0c8d0', fontVariantNumeric: 'tabular-nums' }}>
        {layer.consumption_per_mq ?? '—'}
      </td>
      <td style={{ ...cell, textAlign: 'right', fontSize: '7.5pt', color: layer.overcoat_time ? '#171e29' : '#c0c8d0' }}>
        {layer.overcoat_time ?? '—'}
      </td>
      <td style={{ ...cell, fontSize: '7pt', color: '#445164', lineHeight: 1.35 }}>
        {layer.tool_names.length > 0
          ? layer.tool_names.join('. ')
          : (layer.cleaning_method || '—')}
        {layer.technical_notes && (
          <div style={{ fontSize: '6pt', color: '#8c9aaa', marginTop: '0.5mm' }}>{layer.technical_notes}</div>
        )}
      </td>
      <td style={{ ...cell }}>
        <div style={{ display: 'flex', gap: '1.5mm', flexWrap: 'wrap', alignItems: 'center' }}>
          {iconUrls.length > 0
            ? iconUrls.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: '6.5mm', height: '6.5mm', objectFit: 'contain' }} />
              ))
            : <span style={{ fontSize: '6pt', color: '#d4d6d2' }}>—</span>
          }
        </div>
      </td>
      <td style={{ ...cell, textAlign: 'right', fontSize: '7pt', color: '#a0a8b0' }}>—</td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TechSection({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{
        fontSize: '6pt', fontWeight: 700, letterSpacing: '0.13em',
        textTransform: 'uppercase', color: '#8c9aaa',
        borderBottom: '0.4pt solid #e8eae6',
        paddingBottom: '1mm', marginBottom: '2mm',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row6({ lbl, val }: { lbl: string; val: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2mm', fontSize: '7pt' }}>
      <span style={{ color: '#8c9aaa' }}>{lbl}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{val}</span>
    </div>
  );
}

function IllustrationPlaceholder({ doc }: { doc: StratigraphyDocument }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '6mm', padding: '10mm',
    }}>
      {/* Stacked bars — schematic cross section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm', width: '65%' }}>
        {(['C', 'B', 'A'] as PhaseLabel[]).map(ph => (
          doc.phases[ph].length > 0 && (
            <div key={ph} style={{
              height: `${Math.max(6, doc.phases[ph].length * 5)}mm`,
              background: PHASE_COLOR[ph] + 'bb',
              borderRadius: '1.5mm',
              display: 'flex', alignItems: 'center', paddingLeft: '3mm',
            }}>
              <span style={{ fontSize: '6pt', fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>
                {PHASE_LBL[ph]}
              </span>
            </div>
          )
        ))}
        <div style={{ height: '6mm', background: '#b0b8c4', borderRadius: '1.5mm', display: 'flex', alignItems: 'center', paddingLeft: '3mm' }}>
          <span style={{ fontSize: '6pt', fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>SUPPORTO</span>
        </div>
      </div>
      <p style={{ fontSize: '6pt', color: '#b0b8c4', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
        Carica il diagramma stratigrafico<br />in Admin → Manuali strat.
      </p>
    </div>
  );
}
