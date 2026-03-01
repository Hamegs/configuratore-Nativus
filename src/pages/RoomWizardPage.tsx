import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/project-store';
import { useWizardStore } from '../store/wizard-store';
import { ROOM_TYPES } from '../types/project';
import { WizardContainer } from '../components/wizard/WizardContainer';
import type { CartResult } from '../engine/cart-calculator';
import type { AmbienteId } from '../types/enums';

export function RoomWizardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const rooms = useProjectStore(s => s.rooms);
  const setRoomResult = useProjectStore(s => s.setRoomResult);

  const reset = useWizardStore(s => s.reset);
  const hydrateFromState = useWizardStore(s => s.hydrateFromState);
  const setAmbiente = useWizardStore(s => s.setAmbiente);

  const room = rooms.find(r => r.id === roomId);

  useEffect(() => {
    if (!room) {
      navigate('/progetto');
      return;
    }
    if (room.wizard_state) {
      hydrateFromState(room.wizard_state);
    } else {
      reset();
      const roomTypeDef = ROOM_TYPES.find(t => t.id === room.room_type);
      if (roomTypeDef?.env_default) {
        setAmbiente(roomTypeDef.env_default as AmbienteId);
      }
    }
  }, [roomId]);

  if (!room) return null;

  function handleComplete(result: CartResult) {
    if (!roomId) return;
    const wizState = useWizardStore.getState();
    setRoomResult(roomId, wizState, result.summary.lines);
    navigate('/progetto');
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
      <WizardContainer onComplete={handleComplete} />
    </div>
  );
}
