import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/project-store';
import { ROOM_TYPES } from '../types/project';
import { loadDataStore } from '../utils/data-loader';

export function ProjectPage() {
  const navigate = useNavigate();
  const { rooms, cart_built, addRoom, removeRoom, unconfigureRoom, buildCart, reset, hydrate } = useProjectStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState('SOGGIORNO');
  const [newName, setNewName] = useState('');

  useEffect(() => { hydrate(); }, []);

  const configuredCount = rooms.filter(r => r.is_configured).length;

  function handleAdd() {
    const label = ROOM_TYPES.find(t => t.id === newType)?.label ?? newType;
    const name = newName.trim() || label;
    addRoom(newType, name);
    setNewName('');
    setShowAddForm(false);
  }

  function handleConfigure(roomId: string) {
    navigate(`/progetto/stanza/${roomId}`);
  }

  function handleBuildCart() {
    const store = loadDataStore();
    buildCart(store);
    navigate('/progetto/carrello');
  }

  function handleViewCart() {
    navigate('/progetto/carrello');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progetto</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rooms.length} {rooms.length === 1 ? 'ambiente' : 'ambienti'} · {configuredCount} configurati
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => setShowAddForm(true)}>
            + Aggiungi ambiente
          </button>
          {configuredCount > 0 && (
            cart_built
              ? <button type="button" className="btn-primary text-sm" onClick={handleViewCart}>Vedi carrello →</button>
              : <button type="button" className="btn-primary text-sm" onClick={handleBuildCart}>Genera carrello →</button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="card p-4 border-brand-200 bg-brand-50 space-y-3">
          <h3 className="font-semibold text-sm text-gray-800">Nuovo ambiente</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label-text">Tipo</label>
              <select className="input-field" value={newType} onChange={e => setNewType(e.target.value)}>
                {ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Nome personalizzato <span className="text-gray-400">(opzionale)</span></label>
              <input
                type="text"
                className="input-field"
                placeholder={ROOM_TYPES.find(t => t.id === newType)?.label}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button type="button" className="btn-primary text-sm" onClick={handleAdd}>Aggiungi</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowAddForm(false)}>Annulla</button>
          </div>
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Nessun ambiente nel progetto.</p>
          <p className="text-sm mt-2">Aggiungi soggiorno, cucina, camera, bagno o lavanderia.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => {
            const typeLabel = ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? room.room_type;
            return (
              <div key={room.id} className={`card p-5 flex flex-col gap-3 border ${room.is_configured ? 'border-green-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{typeLabel}</span>
                    <h3 className="font-semibold text-gray-900 mt-0.5">{room.custom_name || typeLabel}</h3>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${room.is_configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {room.is_configured ? 'Configurato' : 'Da configurare'}
                  </span>
                </div>
                {room.is_configured && room.wizard_state && (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {room.wizard_state.mq_pavimento > 0 && <div>Pavimento: {room.wizard_state.mq_pavimento} m²</div>}
                    {room.wizard_state.mq_pareti > 0 && <div>Pareti: {room.wizard_state.mq_pareti} m²</div>}
                    {room.wizard_state.texture_line && <div>Texture: {room.wizard_state.texture_line} {room.wizard_state.texture_style}</div>}
                    <div className="text-green-600 font-medium mt-1">
                      {room.cart_lines.reduce((a, l) => a + l.totale, 0).toFixed(2)} € stimati
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-auto">
                  <button type="button" className="btn-primary text-xs flex-1" onClick={() => handleConfigure(room.id)}>
                    {room.is_configured ? 'Ri-configura' : 'Configura'}
                  </button>
                  {room.is_configured && (
                    <button type="button" className="btn-secondary text-xs" onClick={() => unconfigureRoom(room.id)} title="Azzera configurazione">
                      ✕
                    </button>
                  )}
                  <button type="button" className="btn-secondary text-xs text-red-500" onClick={() => removeRoom(room.id)} title="Rimuovi ambiente">
                    Rimuovi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rooms.length > 0 && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button type="button" className="text-sm text-red-500 hover:underline" onClick={() => { if (confirm('Azzerare tutto il progetto?')) reset(); }}>
            Azzera progetto
          </button>
          <p className="text-xs text-gray-400">Le modifiche sono salvate automaticamente nel browser.</p>
        </div>
      )}
    </div>
  );
}
