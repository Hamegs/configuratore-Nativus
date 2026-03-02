import React, { useLayoutEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/project-store';
import { useWizardStore } from '../store/wizard-store';
import { ROOM_TYPES } from '../types/project';
import { WizardContainer } from '../components/wizard/WizardContainer';
import type { CartResult } from '../engine/cart-calculator';
import type { AmbienteId } from '../types/enums';
import { loadDataStore } from '../utils/data-loader';

export function RoomWizardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const rooms = useProjectStore(s => s.rooms);
  const setRoomResult = useProjectStore(s => s.setRoomResult);

  const reset = useWizardStore(s => s.reset);
  const hydrateFromState = useWizardStore(s => s.hydrateFromState);
  const setAmbiente = useWizardStore(s => s.setAmbiente);
  const setRoomTypeDisplay = useWizardStore(s => s.setRoomTypeDisplay);

  const [warnings, setWarnings] = useState<{ code: string; text: string }[]>([]);

  const room = rooms.find(r => r.id === roomId);

  useLayoutEffect(() => {
    if (!room) {
      navigate('/progetto');
      return;
    }
    setWarnings([]);
    if (room.wizard_state) {
      hydrateFromState(room.wizard_state);
    } else {
      reset();
      const roomTypeDef = ROOM_TYPES.find(t => t.id === room.room_type);
      if (roomTypeDef?.env_default) {
        setAmbiente(roomTypeDef.env_default as AmbienteId);
      }
      setRoomTypeDisplay(room.room_type);
    }
  }, [roomId]);

  if (!room) return null;

  function handleComplete(result: CartResult) {
    if (!roomId) return;
    const wizState = useWizardStore.getState();
    const store = loadDataStore();
    // setRoomResult ora auto-builda il carrello
    setRoomResult(roomId, wizState, result.summary.lines, store, result);

    if (result.computation_errors.length > 0) {
      setWarnings(result.computation_errors);
    } else {
      navigate('/progetto/carrello');
    }
  }

  const roomLabel = ROOM_TYPES.find(t => t.id === room.room_type)?.label ?? room.room_type;

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700"
            onClick={() => navigate('/progetto')}
          >
            ← Progetto
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800">
            {room.custom_name || roomLabel}
          </span>
          {room.is_configured && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Ri-configurazione
            </span>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mx-auto max-w-3xl mt-4 px-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="font-semibold text-amber-800 text-sm mb-1">
              Avvisi tecnici — il carrello è stato generato parzialmente
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-700">
              {warnings.map((w, i) => (
                <li key={i}>{w.text}</li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 mt-2">
              Le combinazioni mancanti possono essere aggiunte in{' '}
              <a href="/admin" className="underline font-medium">Admin → Stratigrafie</a>.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => navigate('/progetto/carrello')}
              >
                Vai al carrello →
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setWarnings([])}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      <WizardContainer onComplete={handleComplete} lockedAmbiente={true} />
    </div>
  );
}
