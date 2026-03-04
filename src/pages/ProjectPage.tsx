import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, FileText, Plus, ShoppingCart } from 'lucide-react';
import { useProjectStore } from '../store/project-store';
import { useAuthStore } from '../store/auth-store';
import { ROOM_TYPES } from '../types/project';
import { loadDataStore } from '../utils/data-loader';

export function ProjectPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { rooms, cart_built, addRoom, removeRoom, unconfigureRoom, buildCart, reset, hydrate } = useProjectStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState('SOGGIORNO');
  const [newName, setNewName] = useState('');

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (!cart_built) {
      const store = loadDataStore();
      buildCart(store);
    }
  }, [rooms, cart_built]);

  const configuredCount = rooms.filter(r => r.is_configured).length;
  const totalEur = rooms.reduce((sum, r) =>
    sum + r.cart_lines.reduce((s, l) => s + l.totale, 0), 0
  );

  function handleAdd() {
    const label = ROOM_TYPES.find(t => t.id === newType)?.label ?? newType;
    const name = newName.trim() || label;
    addRoom(newType, name);
    setNewName('');
    setShowAddForm(false);
  }

  async function handleExportRoomXlsx(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const { exportRoomXlsx } = await import('../utils/export-xlsx');
    exportRoomXlsx(room);
  }

  async function handleExportRoomPdf(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const { exportRoomPdf } = await import('../utils/export-pdf');
    exportRoomPdf(room);
  }

  return (
    <div>
      {/* ── Hero band ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'url(/hero-nativus.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat',
          minHeight: 200,
        }}
      >
        {/* Light overlay gradient for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(234,235,233,0.90) 0%, rgba(234,235,233,0.75) 60%, rgba(234,235,233,0.88) 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '48px 32px 40px',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#445164',
                marginBottom: 10,
              }}
            >
              {user?.displayName ?? 'Progetto'}
            </p>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 300,
                letterSpacing: '0.04em',
                color: '#171e29',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              I miei Progetti
            </h1>
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: '#445164',
                letterSpacing: '0.02em',
              }}
            >
              {rooms.length} {rooms.length === 1 ? 'ambiente' : 'ambienti'}
              {configuredCount > 0 && ` · ${configuredCount} configurati`}
              {totalEur > 0 && ` · ${fmtEur(totalEur)} totale stimato`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {configuredCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/progetto/carrello')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent',
                  border: '1.5px solid rgba(23,30,41,0.35)',
                  color: '#171e29',
                  padding: '10px 20px',
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.18s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#171e29')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(23,30,41,0.35)')}
              >
                <ShoppingCart size={14} />
                Carrello
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#171e29',
                border: '1.5px solid #171e29',
                color: '#ffffff',
                padding: '10px 20px',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <Plus size={13} />
              Aggiungi ambiente
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '36px 32px',
        }}
      >
        {/* Add form */}
        {showAddForm && (
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #e8e8e6',
              padding: '24px 28px',
              marginBottom: 28,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <p className="surtitle" style={{ marginBottom: 16 }}>Nuovo ambiente</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <div>
                <label className="label-text">Tipo ambiente</label>
                <select
                  className="select-field"
                  style={{ width: 200 }}
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                >
                  {ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Nome personalizzato <span style={{ color: '#b8b8b4', fontWeight: 400, textTransform: 'none' }}>(opzionale)</span></label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: 220 }}
                  placeholder={ROOM_TYPES.find(t => t.id === newType)?.label}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <button type="button" className="btn-primary" onClick={handleAdd}>
                Aggiungi
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {rooms.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: '#171e29',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Plus size={20} color="#ffffff" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#171e29', letterSpacing: '0.04em', marginBottom: 8 }}>
              Nessun ambiente
            </p>
            <p style={{ fontSize: 13, color: '#9a9a96', lineHeight: 1.6 }}>
              Aggiungi il primo ambiente per iniziare la configurazione.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 24 }}
              onClick={() => setShowAddForm(true)}
            >
              + Aggiungi ambiente
            </button>
          </div>
        )}

        {/* Room grid */}
        {rooms.length > 0 && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {rooms.map(room => {
                const typeLabel = ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? room.room_type;
                const roomEur = room.cart_lines.reduce((s, l) => s + l.totale, 0);
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    typeLabel={typeLabel}
                    roomEur={roomEur}
                    onConfigure={() => navigate(`/progetto/stanza/${room.id}`)}
                    onExportXlsx={() => handleExportRoomXlsx(room.id)}
                    onExportPdf={() => handleExportRoomPdf(room.id)}
                    onUnconfigure={() => unconfigureRoom(room.id)}
                    onRemove={() => removeRoom(room.id)}
                  />
                );
              })}
            </div>

            {/* Footer actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 40,
                paddingTop: 24,
                borderTop: '1px solid #e8e8e6',
              }}
            >
              <button
                type="button"
                onClick={() => { if (confirm('Azzerare tutto il progetto?')) reset(); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#c0392b',
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Azzera progetto
              </button>
              <p style={{ fontSize: 11, color: '#b8b8b4', letterSpacing: '0.04em' }}>
                Il carrello si aggiorna automaticamente.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Room card ─────────────────────────────────────────────────────────────── */

interface RoomCardProps {
  room: ReturnType<typeof useProjectStore.getState>['rooms'][0];
  typeLabel: string;
  roomEur: number;
  onConfigure: () => void;
  onExportXlsx: () => void;
  onExportPdf: () => void;
  onUnconfigure: () => void;
  onRemove: () => void;
}

function RoomCard({
  room, typeLabel, roomEur,
  onConfigure, onExportXlsx, onExportPdf, onUnconfigure, onRemove,
}: RoomCardProps) {
  const configured = room.is_configured;

  return (
    <div
      style={{
        background: '#ffffff',
        border: configured ? '1.5px solid #c8d6c8' : '1.5px solid #e8e8e6',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'box-shadow 0.18s',
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #f2f2f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <p className="surtitle" style={{ marginBottom: 4 }}>{typeLabel}</p>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: '#171e29',
              letterSpacing: '0.03em',
              margin: 0,
            }}
          >
            {room.custom_name || typeLabel}
          </h3>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            border: configured ? '1px solid #c8d6c8' : '1px solid #e8e8e6',
            background: configured ? '#f0f7f0' : '#f7f7f5',
            color: configured ? '#2d6a2d' : '#9a9a96',
          }}
        >
          {configured ? 'Configurato' : 'Da configurare'}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 20px', flex: 1 }}>
        {configured && room.wizard_state ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {room.wizard_state.mq_pavimento > 0 && (
              <Row label="Pavimento" value={`${room.wizard_state.mq_pavimento} m²`} />
            )}
            {room.wizard_state.mq_pareti > 0 && (
              <Row label="Pareti" value={`${room.wizard_state.mq_pareti} m²`} />
            )}
            {room.wizard_state.texture_line && (
              <Row label="Texture" value={`${room.wizard_state.texture_line}${room.wizard_state.texture_style ? ' · ' + room.wizard_state.texture_style : ''}`} />
            )}
            {room.computation_errors.length > 0 && (
              <p style={{ fontSize: 11, color: '#d97706', fontWeight: 500, marginTop: 4 }}>
                ⚠ {room.computation_errors.length} avviso/i tecnico/i
              </p>
            )}
            {roomEur > 0 && (
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#171e29',
                  marginTop: 8,
                  letterSpacing: '0.02em',
                }}
              >
                {fmtEur(roomEur)}
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#b8b8b4', letterSpacing: '0.02em' }}>
            Clicca "Configura" per impostare texture e protettivi.
          </p>
        )}
      </div>

      {/* Card footer actions */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid #f2f2f0',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="btn-primary"
          style={{ flex: 1, minWidth: 100, minHeight: 40, fontSize: 11 }}
          onClick={onConfigure}
        >
          {configured ? 'Ri-configura' : 'Configura'}
        </button>
        {configured && (
          <>
            <IconBtn title="Esporta Excel" onClick={onExportXlsx}>
              <FileSpreadsheet size={13} />
            </IconBtn>
            <IconBtn title="Esporta PDF" onClick={onExportPdf}>
              <FileText size={13} />
            </IconBtn>
            <IconBtn title="Azzera configurazione" onClick={onUnconfigure}>
              ✕
            </IconBtn>
          </>
        )}
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'transparent',
            border: '1.5px solid #e8e8e6',
            color: '#c0392b',
            padding: '0 12px',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            minHeight: 40,
            transition: 'all 0.15s',
          }}
        >
          Rimuovi
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b6b67' }}>
      <span>{label}</span>
      <span style={{ color: '#171e29', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: '#f7f7f5',
        border: '1.5px solid #e8e8e6',
        color: '#6b6b67',
        width: 40,
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}

function fmtEur(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
