import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FileSpreadsheet, ShoppingCart, TrendingDown, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../store/project-store';
import { useAuthStore } from '../../store/auth-store';
import { ROOM_TYPES } from '../../types/project';
import { loadDataStore } from '../../utils/data-loader';
import { ConfiguratorCore } from '../../components/configurator/ConfiguratorCore';

export function RivenditoresDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    rooms,
    cart_built,
    cart_total_optimized,
    cart_total_separate,
    cart_savings_eur,
    addRoom,
    removeRoom,
    unconfigureRoom,
    buildCart,
    reset,
    hydrate,
  } = useProjectStore();

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
  const hasSavings = cart_savings_eur > 0.5;

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

  async function handleExportXlsx(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const { exportRoomXlsx } = await import('../../utils/export-xlsx');
    exportRoomXlsx(room);
  }

  return (
    <ConfiguratorCore mode="SALES">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* Header */}
        <div className="rounded-xl bg-white border border-blue-100 shadow-sm px-6 py-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Preventivo</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.displayName} — Configurazione Vendita
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{rooms.length} {rooms.length === 1 ? 'ambiente' : 'ambienti'}</span>
                <span className="text-gray-300">·</span>
                <span>{configuredCount} configurati</span>
                {cart_total_optimized > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="font-semibold text-gray-800">
                      {cart_total_optimized.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hasSavings && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-4 py-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    Risparmio: {cart_savings_eur.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                onClick={() => setShowAddForm(true)}
              >
                + Ambiente
              </button>
              {configuredCount > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  onClick={() => navigate('/progetto/carrello')}
                >
                  Preventivo
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
            <h3 className="font-semibold text-sm text-blue-900">Nuovo ambiente</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={ROOM_TYPES.find(t => t.id === newType)?.label}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors" onClick={handleAdd}>Aggiungi</button>
              <button type="button" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setShowAddForm(false)}>Annulla</button>
            </div>
          </div>
        )}

        {/* Rooms */}
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 py-20 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-blue-300 mb-3" />
            <p className="text-gray-500">Nessun ambiente. Inizia aggiungendo un ambiente al progetto.</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
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
              const roomTotal = room.cart_lines?.reduce((a, l) => a + l.totale, 0) ?? 0;

              return (
                <div
                  key={room.id}
                  className={`rounded-xl border p-5 flex flex-col gap-3 bg-white transition-all hover:shadow-md ${
                    room.is_configured ? 'border-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{typeLabel}</span>
                      <h3 className="font-semibold text-gray-900 mt-0.5">{room.custom_name || typeLabel}</h3>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      room.is_configured
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {room.is_configured ? 'Configurato' : 'Da conf.'}
                    </span>
                  </div>

                  {room.is_configured && wiz && (
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between text-xs text-gray-500">
                        {wiz.mq_pavimento > 0 && <span>Pav. {wiz.mq_pavimento} m²</span>}
                        {wiz.mq_pareti > 0 && <span>Par. {wiz.mq_pareti} m²</span>}
                      </div>
                      {wiz.texture_line && (
                        <div className="text-sm font-medium text-gray-800">
                          {wiz.texture_line}
                          {wiz.color_primary?.label && (
                            <span className="ml-1 text-gray-500">— {wiz.color_primary.label}</span>
                          )}
                        </div>
                      )}
                      {roomTotal > 0 && (
                        <div className="mt-2 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700">
                          {roomTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1.5 mt-auto flex-wrap">
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                      onClick={() => navigate(`/progetto/stanza/${room.id}`)}
                    >
                      {room.is_configured ? 'Modifica' : 'Configura'}
                    </button>
                    {room.is_configured && (
                      <>
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50 transition-colors"
                          title="Esporta PDF"
                          onClick={() => handleExportPdf(room.id)}
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50 transition-colors"
                          title="Esporta Excel"
                          onClick={() => handleExportXlsx(room.id)}
                        >
                          <FileSpreadsheet size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
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
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              type="button"
              className="text-sm text-red-400 hover:underline"
              onClick={() => { if (confirm('Azzerare tutto il progetto?')) reset(); }}
            >
              Azzera progetto
            </button>
            <p className="text-xs text-gray-400">Il carrello si aggiorna automaticamente.</p>
          </div>
        )}
      </div>
    </ConfiguratorCore>
  );
}
