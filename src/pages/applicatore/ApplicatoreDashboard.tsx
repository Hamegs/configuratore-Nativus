import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FileSpreadsheet, Layers, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../store/project-store';
import { useAuthStore } from '../../store/auth-store';
import { ROOM_TYPES } from '../../types/project';
import { loadDataStore } from '../../utils/data-loader';
import { ConfiguratorCore } from '../../components/configurator/ConfiguratorCore';
import { RoleGate } from '../../components/ui/RoleGate';

export function ApplicatoreDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { rooms, cart_built, addRoom, removeRoom, unconfigureRoom, buildCart, reset, hydrate } = useProjectStore();

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (!cart_built) {
      const store = loadDataStore();
      buildCart(store);
    }
  }, [rooms, cart_built]);

  const configuredCount = rooms.filter(r => r.is_configured).length;
  const totalArea = rooms.reduce((sum, r) => {
    const mq = (r.wizard_state?.mq_pavimento ?? 0) + (r.wizard_state?.mq_pareti ?? 0);
    return sum + mq;
  }, 0);

  async function handleAddRoom() {
    const label = ROOM_TYPES[0].label;
    addRoom(ROOM_TYPES[0].id, label);
  }

  async function handleExportPdf(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const { exportRoomPdf } = await import('../../utils/export-pdf');
    exportRoomPdf(room);
  }

  async function handleExportXlsx(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const { exportRoomXlsx } = await import('../../utils/export-xlsx');
    exportRoomXlsx(room);
  }

  return (
    <ConfiguratorCore mode="TECHNICAL">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* Header */}
        <div className="rounded-xl bg-slate-800 border border-slate-700 px-6 py-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers className="h-5 w-5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Cantiere Attivo</span>
              </div>
              <h1 className="text-2xl font-bold text-white">
                {user?.displayName} — Configurazione Tecnica
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
                <span>{rooms.length} {rooms.length === 1 ? 'ambiente' : 'ambienti'}</span>
                <span className="text-slate-600">·</span>
                <span>{configuredCount} configurati</span>
                {totalArea > 0 && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>{totalArea} m² totali</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
                onClick={handleAddRoom}
              >
                + Ambiente
              </button>
              {configuredCount > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
                  onClick={() => navigate('/progetto/applicatore')}
                >
                  Vista Operativa
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Room Grid */}
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/50 py-20 text-center">
            <div className="text-4xl mb-3">⬚</div>
            <p className="text-slate-400">Nessun ambiente. Aggiungi il primo ambiente per iniziare.</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors"
              onClick={handleAddRoom}
            >
              + Aggiungi ambiente
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map(room => {
              const typeLabel = ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? room.room_type;
              const wiz = room.wizard_state;
              const roomTotal = room.cart_lines?.reduce((a, l) => a + l.totale, 0) ?? 0;

              return (
                <div
                  key={room.id}
                  className={`rounded-xl border p-5 flex flex-col gap-3 transition-all ${
                    room.is_configured
                      ? 'border-cyan-800 bg-slate-800'
                      : 'border-slate-700 bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{typeLabel}</span>
                      <h3 className="font-semibold text-slate-100 mt-0.5">{room.custom_name || typeLabel}</h3>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      room.is_configured
                        ? 'bg-cyan-900 text-cyan-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {room.is_configured ? 'Configurato' : 'Da configurare'}
                    </span>
                  </div>

                  {room.is_configured && wiz && (
                    <div className="space-y-1 font-mono text-xs text-slate-400">
                      {wiz.mq_pavimento > 0 && <div>PAV: {wiz.mq_pavimento} m²</div>}
                      {wiz.mq_pareti > 0 && <div>PAR: {wiz.mq_pareti} m²</div>}
                      {wiz.texture_line && (
                        <div className="text-cyan-400">
                          {wiz.texture_line}{wiz.texture_style ? ` · ${wiz.texture_style}` : ''}
                        </div>
                      )}
                      {wiz.supporto_floor && <div>SUP: {wiz.supporto_floor}</div>}
                      {room.computation_errors.length > 0 && (
                        <div className="text-amber-400">⚠ {room.computation_errors.length} avviso/i</div>
                      )}

                      {/* RoleGate: technical data only for TECHNICAL mode */}
                      <RoleGate allow={['TECHNICAL']}>
                        {(wiz.resolved_steps_floor?.length ?? 0) > 0 && (
                          <div className="text-slate-500 mt-1">
                            {wiz.resolved_steps_floor.length} step tecnici
                          </div>
                        )}
                      </RoleGate>
                    </div>
                  )}

                  <div className="flex gap-1.5 mt-auto flex-wrap">
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-600 transition-colors"
                      onClick={() => navigate(`/progetto/stanza/${room.id}`)}
                    >
                      {room.is_configured ? 'Ri-configura' : 'Configura'}
                    </button>
                    {room.is_configured && (
                      <>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-700 p-2 text-slate-300 hover:bg-slate-600 transition-colors"
                          title="Esporta PDF tecnico"
                          onClick={() => handleExportPdf(room.id)}
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-700 p-2 text-slate-300 hover:bg-slate-600 transition-colors"
                          title="Esporta Excel"
                          onClick={() => handleExportXlsx(room.id)}
                        >
                          <FileSpreadsheet size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-600 transition-colors"
                          onClick={() => unconfigureRoom(room.id)}
                          title="Azzera configurazione"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-red-400 hover:bg-slate-600 transition-colors"
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
          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <button
              type="button"
              className="text-sm text-red-400 hover:underline"
              onClick={() => { if (confirm('Azzerare tutto il progetto?')) reset(); }}
            >
              Azzera progetto
            </button>
            {configuredCount > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
                onClick={() => navigate('/progetto/carrello')}
              >
                Carrello materiali →
              </button>
            )}
          </div>
        )}
      </div>
    </ConfiguratorCore>
  );
}
