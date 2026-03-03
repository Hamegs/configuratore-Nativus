import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BookOpen, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../store/project-store';
import { useAuthStore } from '../../store/auth-store';
import { ROOM_TYPES } from '../../types/project';
import { loadDataStore } from '../../utils/data-loader';
import { ConfiguratorCore } from '../../components/configurator/ConfiguratorCore';
import { RoleGate } from '../../components/ui/RoleGate';

export function ProgettistaDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
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

  function handleAdd() {
    const label = ROOM_TYPES.find(t => t.id === newType)?.label ?? newType;
    const name = newName.trim() || label;
    addRoom(newType, name);
    setNewName('');
    setShowAddForm(false);
  }

  async function handleExportPdf(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const { exportRoomPdf } = await import('../../utils/export-pdf');
    exportRoomPdf(room);
  }

  return (
    <ConfiguratorCore mode="SPEC">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* Header */}
        <div className="rounded-xl bg-white border border-stone-200 shadow-sm px-6 py-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-5 w-5 text-stone-600" />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Specifica Tecnica</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.displayName} — Progetto
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-stone-500">
                <span>{rooms.length} {rooms.length === 1 ? 'ambiente' : 'ambienti'}</span>
                <span className="text-stone-300">·</span>
                <span>{configuredCount} specificati</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                onClick={() => setShowAddForm(true)}
              >
                + Ambiente
              </button>
              {configuredCount > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 transition-colors"
                  onClick={() => navigate('/progetto/applicatore')}
                >
                  Documentazione
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 space-y-3">
            <h3 className="font-semibold text-sm text-stone-800">Nuovo ambiente</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                >
                  {ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  placeholder={ROOM_TYPES.find(t => t.id === newType)?.label}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <button type="button" className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 transition-colors" onClick={handleAdd}>Aggiungi</button>
              <button type="button" className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setShowAddForm(false)}>Annulla</button>
            </div>
          </div>
        )}

        {/* Rooms */}
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 py-20 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-stone-300 mb-3" />
            <p className="text-stone-500">Nessun ambiente. Aggiungi il primo ambiente al progetto.</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition-colors"
              onClick={() => setShowAddForm(true)}
            >
              + Aggiungi ambiente
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map(room => {
              const typeLabel = ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? room.room_type;
              const wiz = room.wizard_state;

              return (
                <div
                  key={room.id}
                  className={`rounded-xl border p-5 flex flex-col gap-3 bg-white transition-all hover:shadow-md ${
                    room.is_configured ? 'border-stone-300' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">{typeLabel}</span>
                      <h3 className="font-semibold text-gray-900 mt-0.5">{room.custom_name || typeLabel}</h3>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      room.is_configured
                        ? 'bg-stone-100 text-stone-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {room.is_configured ? 'Specificato' : 'Da spec.'}
                    </span>
                  </div>

                  {room.is_configured && wiz && (
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-3 text-xs text-stone-500">
                        {wiz.mq_pavimento > 0 && <span>Pavimento: {wiz.mq_pavimento} m²</span>}
                        {wiz.mq_pareti > 0 && <span>Pareti: {wiz.mq_pareti} m²</span>}
                      </div>
                      {wiz.texture_line && (
                        <div className="text-sm font-medium text-gray-800">
                          Sistema: {wiz.texture_line}
                          {wiz.texture_style && <span className="text-gray-500"> · {wiz.texture_style}</span>}
                        </div>
                      )}
                      {wiz.supporto_floor && (
                        <div className="text-xs text-stone-400">Supporto: {wiz.supporto_floor}</div>
                      )}

                      {/* Stratigrafia steps count - spec-relevant info */}
                      <RoleGate allow={['SPEC']}>
                        {(wiz.resolved_steps_floor?.length ?? 0) > 0 && (
                          <div className="rounded bg-stone-50 px-2 py-1 text-xs text-stone-500">
                            {wiz.resolved_steps_floor.length} strati · {
                              wiz.resolved_steps_floor
                                .reduce((sum, s) => sum + (s.qty_total ?? 0), 0)
                                .toFixed(1)
                            } kg/m² totali
                          </div>
                        )}
                      </RoleGate>

                      {/* No prices in SPEC mode — hidden by RoleGate in parent context */}
                    </div>
                  )}

                  <div className="flex gap-1.5 mt-auto flex-wrap">
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-stone-800 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-700 transition-colors"
                      onClick={() => navigate(`/progetto/stanza/${room.id}`)}
                    >
                      {room.is_configured ? 'Ri-specifica' : 'Specifica'}
                    </button>
                    {room.is_configured && (
                      <>
                        <button
                          type="button"
                          className="rounded-lg border border-stone-200 p-2 text-stone-400 hover:bg-stone-50 transition-colors"
                          title="Esporta specifica PDF"
                          onClick={() => handleExportPdf(room.id)}
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-400 hover:bg-stone-50 transition-colors"
                          onClick={() => unconfigureRoom(room.id)}
                        >
                          ✕
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-red-100 px-2 py-1.5 text-xs text-red-400 hover:bg-red-50 transition-colors"
                      onClick={() => removeRoom(room.id)}
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rooms.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t border-stone-200">
            <button
              type="button"
              className="text-sm text-red-400 hover:underline"
              onClick={() => { if (confirm('Azzerare tutto il progetto?')) reset(); }}
            >
              Azzera progetto
            </button>
            <p className="text-xs text-stone-400">Documentazione tecnica aggiornata automaticamente.</p>
          </div>
        )}
      </div>
    </ConfiguratorCore>
  );
}
