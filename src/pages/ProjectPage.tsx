import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Settings, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '../store/project-store';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { ROOM_TYPES, type ProjectRoom } from '../types/project';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEur = (v: number) =>
  v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

const ROOM_HERO: Record<string, string> = {
  SOGGIORNO:   '/brand/nativus/interiors/living_main.jpg',
  CUCINA:      '/brand/nativus/interiors/kitchen_main.jpg',
  BAGNO:       '/brand/nativus/interiors/bathroom_main.jpg',
  CAMERA:      '/brand/nativus/interiors/bedroom_main.jpg',
  LAVANDERIA:  '/brand/nativus/interiors/bathroom_main.jpg',
};
const FALLBACK_HERO = '/brand/nativus/interiors/lamine_scene.jpg';

const TEXTURE_PREVIEW: Record<string, string> = {
  CRYSTEPO: '/brand/nativus/materials/crystepo_detail_01.jpg',
  LAMINE:   '/brand/nativus/interiors/lamine_scene.jpg',
  NATURAL:  '/brand/nativus/interiors/natural_hero.jpg',
  SENSE:    '/brand/nativus/interiors/living_main.jpg',
};

const TEXTURE_LABEL: Record<string, string> = {
  NATURAL: 'Natural', SENSE: 'Sense', DEKORA: 'Dekora',
  LAMINE: 'Lamine', CRYSTEPO: 'Crystepo', MATERIAL: 'Material', CORLITE: 'Corlite',
};

const SECTION_COLORS: Record<string, string> = {
  fondo:       '#d4c4a8',
  texture:     '#8fa89a',
  protettivi:  '#b8c4c2',
  din:         '#c8b89c',
  doccia:      '#a0b4c0',
};

function getRoomHero(room: ProjectRoom): string {
  return ROOM_HERO[room.room_type] ?? FALLBACK_HERO;
}
function getTextureLine(room: ProjectRoom): string | null {
  return (
    room.wizard_state?.texture_line ??
    room.wizard_state?.surfaces?.[0]?.texture_line ??
    null
  );
}
function getTexturePreview(room: ProjectRoom): string | null {
  const l = getTextureLine(room);
  return l ? (TEXTURE_PREVIEW[l] ?? null) : null;
}
function getRoomLabel(room: ProjectRoom): string {
  return room.custom_name || (ROOM_TYPES.find(r => r.id === room.room_type)?.label ?? 'Ambiente');
}
function getTotalMq(room: ProjectRoom): number {
  const s = room.wizard_state;
  if (!s) return 0;
  if (s.surfaces?.length) return s.surfaces.reduce((a, b) => a + (b.mq ?? 0), 0);
  return (s.mq_pavimento ?? 0) + (s.mq_pareti ?? 0);
}
function getSystemLabel(room: ProjectRoom): string {
  const l = getTextureLine(room);
  return l ? (TEXTURE_LABEL[l] ?? l) : '';
}
function getStratigraphySections(room: ProjectRoom) {
  if (!room.cart_result) return [];
  const lines = room.cart_result.summary?.lines ?? [];
  const seen = new Set<string>();
  const out: { section: string; label: string }[] = [];
  for (const l of lines) {
    if (!l.section || seen.has(l.section)) continue;
    seen.add(l.section);
    const LABELS: Record<string, string> = {
      fondo: 'Preparazione', texture: 'Texture', protettivi: 'Protettivo',
      din: 'DIN', doccia: 'Doccia', tracce: 'Tracce',
    };
    out.push({ section: l.section, label: LABELS[l.section] ?? l.section });
  }
  return out;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ProjectPage() {
  const navigate   = useNavigate();
  const user       = useAuthStore(s => s.user);
  const rooms      = useProjectStore(s => s.rooms);
  const addRoom    = useProjectStore(s => s.addRoom);
  const removeRoom = useProjectStore(s => s.removeRoom);
  const cartItems  = useCartStore(s => s.items);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    rooms.length > 0 ? rooms[0].id : null,
  );
  const [showAddForm, setShowAddForm]   = useState(false);
  const [newRoomName, setNewRoomName]   = useState('');
  const [newRoomType, setNewRoomType]   = useState('SOGGIORNO');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const configuredCount = rooms.filter(r => r.is_configured).length;
  const totalEur = rooms.reduce(
    (sum, r) => sum + (r.cart_result?.summary?.total_eur ?? 0),
    0,
  );

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null;

  function handleAddRoom() {
    if (!newRoomName.trim()) return;
    addRoom(newRoomType, newRoomName.trim());
    setNewRoomName('');
    setShowAddForm(false);
  }
  function handleDelete(roomId: string) {
    removeRoom(roomId);
    if (selectedRoomId === roomId) setSelectedRoomId(rooms.find(r => r.id !== roomId)?.id ?? null);
    setConfirmDelete(null);
  }

  const heroImg = selectedRoom ? getRoomHero(selectedRoom) : FALLBACK_HERO;

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f0', display: 'flex', flexDirection: 'column' }}>

      {/* ── HERO BAND ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          height: 300,
          overflow: 'hidden',
          transition: 'background-image 0.4s',
        }}
      >
        {/* Background photo */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${heroImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
            filter: 'brightness(0.88)',
            transition: 'background-image 0.35s ease',
          }}
        />
        {/* Dark-to-transparent gradient overlay */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0) 100%)',
          }}
        />
        {/* Content */}
        <div
          style={{
            position: 'relative', zIndex: 1,
            maxWidth: 1400, margin: '0 auto',
            padding: '36px 40px 0',
            display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between',
          }}
        >
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
                {user?.displayName ?? user?.username ?? 'Progetto'}
              </p>
              <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: '0.04em', color: '#ffffff', margin: 0, lineHeight: 1.15 }}>
                Configuratore Nativus
              </h1>
              <p style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.02em' }}>
                {rooms.length} {rooms.length === 1 ? 'ambiente' : 'ambienti'}
                {configuredCount > 0 && ` · ${configuredCount} configurati`}
                {totalEur > 0 && ` · ${fmtEur(totalEur)} stimato`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/progetto/carrello')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.30)',
                    color: '#ffffff', padding: '10px 18px',
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  }}
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
                  background: '#ffffff', border: '1px solid #ffffff',
                  color: '#171e29', padding: '10px 18px',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                Aggiungi ambiente
              </button>
            </div>
          </div>

          {/* Bottom row: selected room context */}
          {selectedRoom && (
            <div style={{ paddingBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 6, height: 6, background: selectedRoom.is_configured ? '#6dbf8a' : '#fff',
                  borderRadius: '50%',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.03em' }}>
                {getRoomLabel(selectedRoom)}
                {getTotalMq(selectedRoom) > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 8, fontWeight: 300 }}>
                    {getTotalMq(selectedRoom).toFixed(0)} m²
                  </span>
                )}
              </span>
              {getSystemLabel(selectedRoom) && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                  borderLeft: '1px solid rgba(255,255,255,0.20)', paddingLeft: 16,
                }}>
                  {getSystemLabel(selectedRoom)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── WORKSPACE ─────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          maxWidth: 1400, margin: '0 auto', width: '100%',
          display: 'flex', gap: 0,
          padding: '32px 40px 40px',
        }}
      >
        {/* ── LEFT: Space map ───────────────────────────────────────── */}
        <div
          style={{
            width: 380, flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: 0,
            marginRight: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#445164' }}>
              Mappa ambienti
            </span>
            <span style={{ fontSize: 11, color: '#8c9aaa' }}>
              {rooms.length} {rooms.length === 1 ? 'spazio' : 'spazi'}
            </span>
          </div>

          {rooms.length === 0 ? (
            <div
              style={{
                border: '1.5px dashed #c8cac6',
                padding: '40px 24px', textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.18s',
              }}
              onClick={() => setShowAddForm(true)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#171e29')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#c8cac6')}
            >
              <Plus size={20} style={{ margin: '0 auto 10px', color: '#8c9aaa' }} />
              <p style={{ fontSize: 12, color: '#8c9aaa', letterSpacing: '0.04em' }}>
                Aggiungi il primo ambiente
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {rooms.map(room => (
                <SpaceBlock
                  key={room.id}
                  room={room}
                  selected={room.id === selectedRoomId}
                  onSelect={() => setSelectedRoomId(room.id)}
                  onDelete={() => setConfirmDelete(room.id)}
                />
              ))}
              {/* Add tile */}
              <div
                onClick={() => setShowAddForm(true)}
                style={{
                  border: '1.5px dashed #c8cac6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 6,
                  minHeight: 130, cursor: 'pointer',
                  color: '#8c9aaa', fontSize: 11, letterSpacing: '0.04em',
                  transition: 'border-color 0.18s, color 0.18s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#171e29';
                  e.currentTarget.style.color = '#171e29';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#c8cac6';
                  e.currentTarget.style.color = '#8c9aaa';
                }}
              >
                <Plus size={16} />
                Aggiungi
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Configuration panel ───────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedRoom ? (
            <EmptyState onAdd={() => setShowAddForm(true)} />
          ) : (
            <RoomDetailPanel
              room={selectedRoom}
              onConfigure={() => navigate(`/progetto/stanza/${selectedRoom.id}`)}
              onDelete={() => setConfirmDelete(selectedRoom.id)}
            />
          )}
        </div>
      </div>

      {/* ── ADD ROOM MODAL ────────────────────────────────────────────────── */}
      {showAddForm && (
        <AddRoomModal
          name={newRoomName}
          roomType={newRoomType}
          onNameChange={setNewRoomName}
          onTypeChange={setNewRoomType}
          onConfirm={handleAddRoom}
          onCancel={() => { setShowAddForm(false); setNewRoomName(''); }}
        />
      )}

      {/* ── DELETE CONFIRM ────────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmModal
          message="Eliminare questo ambiente? La configurazione verrà persa."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ─── SpaceBlock ───────────────────────────────────────────────────────────────

interface SpaceBlockProps {
  room: ProjectRoom;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SpaceBlock({ room, selected, onSelect, onDelete }: SpaceBlockProps) {
  const texPreview = getTexturePreview(room);
  const mq         = getTotalMq(room);
  const systemLbl  = getSystemLabel(room);
  const label      = getRoomLabel(room);

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        background: '#ffffff',
        border: selected ? '2px solid #171e29' : '1.5px solid #e4e5e1',
        cursor: 'pointer',
        overflow: 'hidden',
        minHeight: mq > 30 ? 190 : mq > 12 ? 160 : 130,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: selected ? '0 2px 12px rgba(23,30,41,0.12)' : 'none',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Texture thumbnail strip */}
      {texPreview && (
        <div
          style={{
            height: 56,
            backgroundImage: `url(${texPreview})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.92) saturate(0.85)',
            flexShrink: 0,
          }}
        />
      )}
      {!texPreview && (
        <div
          style={{
            height: 8,
            background: room.is_configured ? '#c8d8c8' : '#e4e5e1',
            flexShrink: 0,
          }}
        />
      )}

      {/* Content */}
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: '#171e29', margin: 0, lineHeight: 1.3 }}>
              {label}
            </p>
            {room.is_configured && (
              <CheckCircle2 size={13} style={{ color: '#6dbf8a', flexShrink: 0, marginTop: 1 }} />
            )}
          </div>
          {mq > 0 && (
            <p style={{ fontSize: 11, color: '#8c9aaa', margin: '3px 0 0', letterSpacing: '0.02em' }}>
              {mq.toFixed(0)} m²
            </p>
          )}
        </div>

        {systemLbl && (
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#445164', margin: '8px 0 0',
          }}>
            {systemLbl}
          </p>
        )}
        {!room.is_configured && !systemLbl && (
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8cac6', margin: '8px 0 0' }}>
            Da configurare
          </p>
        )}
      </div>

      {/* Delete button (shows on hover via CSS handled via inline mouse events) */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{
          position: 'absolute', top: 6, right: 6,
          background: 'rgba(255,255,255,0.85)',
          border: 'none', cursor: 'pointer',
          width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: selected ? 0.7 : 0,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = selected ? '0.7' : '0')}
      >
        <Trash2 size={11} style={{ color: '#c0392b' }} />
      </button>
    </div>
  );
}

// ─── RoomDetailPanel ──────────────────────────────────────────────────────────

interface RoomDetailPanelProps {
  room: ProjectRoom;
  onConfigure: () => void;
  onDelete: () => void;
}

function RoomDetailPanel({ room, onConfigure, onDelete }: RoomDetailPanelProps) {
  const heroImg    = getRoomHero(room);
  const label      = getRoomLabel(room);
  const systemLbl  = getSystemLabel(room);
  const texPreview = getTexturePreview(room);
  const mq         = getTotalMq(room);
  const strat      = getStratigraphySections(room);
  const typeInfo   = ROOM_TYPES.find(r => r.id === room.room_type);
  const totalEur   = room.cart_result?.summary?.total_eur ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Room hero card ── */}
      <div
        style={{
          position: 'relative', overflow: 'hidden',
          height: 220,
          background: '#e4e5e1',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${heroImg})`,
            backgroundSize: 'cover', backgroundPosition: 'center 35%',
            filter: 'brightness(0.82) saturate(0.90)',
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)',
          }}
        />
        <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: '0 0 4px' }}>
                {typeInfo?.label ?? room.room_type}
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 400, letterSpacing: '0.04em', color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                {label}
              </h2>
              {mq > 0 && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0' }}>
                  {mq.toFixed(1)} m² · {systemLbl || 'Sistema da configurare'}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onDelete}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.20)',
                  color: 'rgba(255,255,255,0.75)', padding: '8px 14px',
                  fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                <Trash2 size={11} />
                Elimina
              </button>
              <button
                type="button"
                onClick={onConfigure}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#ffffff', border: '1px solid #ffffff',
                  color: '#171e29', padding: '8px 18px',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {room.is_configured ? (
                  <><Settings size={12} /> Modifica</>
                ) : (
                  <><ArrowRight size={12} /> Configura</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column info cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Stratigraphy preview */}
        <div
          style={{
            background: '#ffffff', border: '1px solid #e4e5e1',
            padding: '20px 20px 22px',
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#445164', margin: '0 0 16px' }}>
            Stratigrafia
          </p>
          {strat.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {strat.map(({ section, label: lbl }) => (
                <div key={section} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 3, height: 28, flexShrink: 0,
                      background: SECTION_COLORS[section] ?? '#c8cac6',
                    }}
                  />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#171e29', margin: 0 }}>{lbl}</p>
                    {section === 'texture' && systemLbl && (
                      <p style={{ fontSize: 10, color: '#8c9aaa', margin: 0 }}>{systemLbl}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : room.is_configured ? (
            <p style={{ fontSize: 12, color: '#8c9aaa' }}>Stratigrafia disponibile dopo calcolo</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Preparazione', 'Texture', 'Protettivo'].map(lbl => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 28, background: '#e4e5e1' }} />
                  <p style={{ fontSize: 11, color: '#c8cac6', margin: 0, letterSpacing: '0.02em' }}>{lbl}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Material preview + cost */}
        <div
          style={{
            background: '#ffffff', border: '1px solid #e4e5e1',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {texPreview ? (
            <div
              style={{
                height: 90,
                backgroundImage: `url(${texPreview})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'brightness(0.90) saturate(0.85)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{ height: 90, background: '#f2f2f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 10, color: '#c8cac6', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Texture</p>
            </div>
          )}
          <div style={{ padding: '14px 18px', flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#445164', margin: '0 0 6px' }}>
              Sistema decorativo
            </p>
            {systemLbl ? (
              <p style={{ fontSize: 15, fontWeight: 400, color: '#171e29', margin: 0, letterSpacing: '0.03em' }}>
                {systemLbl}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#8c9aaa', margin: 0 }}>Non selezionato</p>
            )}
            {totalEur > 0 && (
              <p style={{ fontSize: 18, fontWeight: 300, color: '#171e29', margin: '12px 0 0', letterSpacing: '0.02em' }}>
                {fmtEur(totalEur)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Configure CTA (if not configured) ── */}
      {!room.is_configured && (
        <div
          style={{
            background: '#171e29',
            padding: '28px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 400, letterSpacing: '0.03em', color: '#ffffff', margin: 0 }}>
              Configura {label}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
              Seleziona supporto, texture e protettivo per generare il preventivo.
            </p>
          </div>
          <button
            type="button"
            onClick={onConfigure}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.35)',
              color: '#ffffff', padding: '12px 24px',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              transition: 'border-color 0.18s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)')}
          >
            Avvia configurazione
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Configured summary ── */}
      {room.is_configured && room.cart_result && (
        <div
          style={{
            background: '#ffffff', border: '1px solid #e4e5e1',
            padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CheckCircle2 size={18} style={{ color: '#6dbf8a' }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#171e29', margin: 0, letterSpacing: '0.03em' }}>
                Configurazione completata
              </p>
              {totalEur > 0 && (
                <p style={{ fontSize: 11, color: '#8c9aaa', margin: '2px 0 0' }}>
                  Stima materiali: <strong style={{ color: '#171e29' }}>{fmtEur(totalEur)}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onConfigure}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1.5px solid #d4d4d2',
              color: '#171e29', padding: '10px 18px',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            <Settings size={11} />
            Modifica
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 360, textAlign: 'center', padding: '40px 24px',
        background: '#ffffff', border: '1px solid #e4e5e1',
      }}
    >
      <div
        style={{
          width: 56, height: 56, marginBottom: 20,
          backgroundImage: 'url(/brand/nativus/materials/crystepo_detail_02.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.85) saturate(0.7)',
        }}
      />
      <p style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.04em', color: '#171e29', margin: '0 0 8px' }}>
        Nessun ambiente selezionato
      </p>
      <p style={{ fontSize: 12, color: '#8c9aaa', margin: '0 0 28px', lineHeight: 1.6 }}>
        Aggiungi un ambiente dalla mappa spaziale<br />per iniziare la configurazione.
      </p>
      <button
        type="button"
        onClick={onAdd}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#171e29', border: 'none',
          color: '#ffffff', padding: '12px 24px',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        <Plus size={13} />
        Aggiungi ambiente
      </button>
    </div>
  );
}

// ─── AddRoomModal ─────────────────────────────────────────────────────────────

interface AddRoomModalProps {
  name: string;
  roomType: string;
  onNameChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function AddRoomModal({ name, roomType, onNameChange, onTypeChange, onConfirm, onCancel }: AddRoomModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(23,30,41,0.60)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: '#ffffff', width: '100%', maxWidth: 480, padding: '36px 40px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#445164', margin: '0 0 20px' }}>
          Nuovo ambiente
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#445164', display: 'block', marginBottom: 8 }}>
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(); }}
              placeholder="es. Bagno piano 1"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid #d4d4d2', background: '#f9f9f7',
                padding: '12px 14px', fontSize: 14, color: '#171e29',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#445164', display: 'block', marginBottom: 8 }}>
              Tipo ambiente
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {ROOM_TYPES.map(rt => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => onTypeChange(rt.id)}
                  style={{
                    padding: '10px 8px',
                    border: rt.id === roomType ? '2px solid #171e29' : '1.5px solid #d4d4d2',
                    background: rt.id === roomType ? '#171e29' : '#ffffff',
                    color: rt.id === roomType ? '#ffffff' : '#171e29',
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'transparent', border: '1.5px solid #d4d4d2',
                color: '#445164', padding: '10px 20px',
                fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!name.trim()}
              style={{
                background: '#171e29', border: '1.5px solid #171e29',
                color: '#ffffff', padding: '10px 24px',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                opacity: name.trim() ? 1 : 0.35,
              }}
            >
              Crea ambiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(23,30,41,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: '#ffffff', maxWidth: 380, width: '100%', padding: '32px 36px' }}>
        <p style={{ fontSize: 13, color: '#171e29', margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel}
            style={{
              flex: 1, padding: '10px', background: 'transparent',
              border: '1.5px solid #d4d4d2', color: '#445164',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
            Annulla
          </button>
          <button type="button" onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', background: '#c0392b',
              border: '1.5px solid #c0392b', color: '#ffffff',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}
