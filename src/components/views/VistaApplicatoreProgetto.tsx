import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/project-store';
import { ROOM_TYPES } from '../../types/project';
import { VistaApplicatore } from './VistaApplicatore';
import type { CartResult } from '../../engine/cart-calculator';

export function VistaApplicatoreProgetto() {
  const navigate = useNavigate();
  const rooms = useProjectStore(s => s.rooms);
  const configuredRooms = rooms.filter(r => r.is_configured && r.cart_result);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(configuredRooms.map(r => r.id)));

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vista Applicatore</h1>
          <p className="text-sm text-gray-500 mt-1">Procedura operativa per tutti gli ambienti del progetto.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => navigate('/progetto/carrello')}
          >
            ← Carrello
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => window.print()}
          >
            Stampa
          </button>
        </div>
      </div>

      {configuredRooms.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Nessun ambiente configurato con procedura disponibile.</p>
          <p className="text-sm mt-2">Configura almeno un ambiente dal progetto.</p>
        </div>
      )}

      {configuredRooms.map((room, idx) => {
        const typeLabel = ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? room.room_type;
        const displayName = room.custom_name || typeLabel;
        const wiz = room.wizard_state;
        const isOpen = expanded.has(room.id);

        return (
          <div key={room.id} className="card overflow-hidden">
            {/* Header ambiente */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggle(room.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-sm shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900">{displayName}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{typeLabel}</span>
                  </div>
                  {wiz && (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      {wiz.mq_pavimento > 0 && (
                        <span className="text-xs text-gray-500">Pavimento {wiz.mq_pavimento} m²</span>
                      )}
                      {wiz.mq_pareti > 0 && (
                        <span className="text-xs text-gray-500">Pareti {wiz.mq_pareti} m²</span>
                      )}
                      {wiz.supporto_floor && (
                        <span className="text-xs text-gray-500">Sup.Pav: <code className="font-mono">{wiz.supporto_floor}</code></span>
                      )}
                      {wiz.supporto_wall && (
                        <span className="text-xs text-gray-500">Sup.Par: <code className="font-mono">{wiz.supporto_wall}</code></span>
                      )}
                      {wiz.presenza_doccia && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Doccia</span>
                      )}
                      {wiz.mercato_tedesco && (
                        <span className="text-xs font-medium text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">DIN 18534</span>
                      )}
                      {wiz.sub_answers_floor?.sfarinante && (
                        <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Sfarinante</span>
                      )}
                      {wiz.sub_answers_floor?.crepe && (
                        <span className="text-xs text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Crepe</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-gray-400 ml-4 shrink-0">{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Procedura */}
            {isOpen && (
              <div className="border-t border-gray-100 px-5 py-5">
                <VistaApplicatore result={room.cart_result as CartResult} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
