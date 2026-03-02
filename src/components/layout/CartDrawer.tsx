import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileSpreadsheet, FileText, ExternalLink } from 'lucide-react';
import { useProjectStore } from '../../store/project-store';
import { loadDataStore } from '../../utils/data-loader';
import type { PackagingStrategy } from '../../types/project';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const STRATEGY_LABELS: Record<PackagingStrategy, string> = {
  MINIMO_SFRIDO: 'Min. sfrido',
  ECONOMICO: 'Economico',
  CONFEZIONI_GRANDI: 'Grandi',
  CONFEZIONI_PICCOLE: 'Piccole',
  MANUALE: 'Manuale',
};

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);

  const { cart, rooms, strategy, waste_pct, setStrategy, setWastePct } = useProjectStore(s => ({
    cart: s.cart,
    rooms: s.rooms,
    strategy: s.strategy,
    waste_pct: s.waste_pct,
    setStrategy: s.setStrategy,
    setWastePct: s.setWastePct,
  }));

  const activeRows = cart.filter(r => r.status === 'active');
  const totalPacks = activeRows.reduce((a, r) => a + r.qty_packs, 0);
  const totalEur = activeRows.reduce((a, r) => a + r.totale, 0);
  const configuredRooms = rooms.filter(r => r.is_configured);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleExportXlsx() {
    try {
      const { exportProjectXlsx } = await import('../../utils/export-xlsx');
      exportProjectXlsx(configuredRooms, activeRows, strategy);
    } catch (e) { console.error(e); }
  }

  async function handleExportPdf() {
    try {
      const { exportProjectPdf } = await import('../../utils/export-pdf');
      exportProjectPdf(configuredRooms, activeRows);
    } catch (e) { console.error(e); }
  }

  const store = loadDataStore();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-50 flex w-96 flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Carrello progetto</h2>
            <p className="text-sm text-stone-500">
              {totalPacks} confezioni — {totalEur.toFixed(2)} €
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-stone-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Sfrido */}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Sfrido globale: <span className="font-bold text-stone-800">{Math.round(waste_pct * 100)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={Math.round(waste_pct * 100)}
              onChange={e => setWastePct(Number(e.target.value) / 100, store)}
              className="w-full accent-stone-700"
            />
            <div className="mt-0.5 flex justify-between text-xs text-stone-400">
              <span>0%</span><span>10%</span><span>20%</span>
            </div>
          </div>

          {/* Strategia */}
          <div>
            <p className="mb-1 text-xs font-medium text-stone-600">Strategia confezioni</p>
            <div className="grid grid-cols-5 gap-1">
              {(Object.keys(STRATEGY_LABELS) as PackagingStrategy[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStrategy(s, store)}
                  className={`rounded px-1 py-1.5 text-xs font-medium transition-colors ${
                    strategy === s
                      ? 'bg-stone-800 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {STRATEGY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Per ambiente */}
          {configuredRooms.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-stone-600 uppercase tracking-wide">Per ambiente</p>
              <div className="space-y-2">
                {configuredRooms.map(room => {
                  const roomRows = activeRows.filter(r => r.from_rooms?.includes(room.custom_name || room.room_type));
                  const roomTotal = roomRows.reduce((a, r) => a + r.totale, 0);
                  const roomPacks = roomRows.reduce((a, r) => a + r.qty_packs, 0);
                  return (
                    <div key={room.id} className="rounded-lg border border-stone-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-stone-800 text-sm">
                          {room.custom_name || room.room_type}
                        </span>
                        <span className="text-xs text-stone-500">{roomPacks} conf.</span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-stone-700">{roomTotal.toFixed(2)} €</div>
                      {room.computation_errors.length > 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          ⚠ {room.computation_errors.length} avviso/i tecnico/i
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {configuredRooms.length === 0 && (
            <p className="text-center text-sm text-stone-400 py-6">
              Nessun ambiente configurato ancora.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 space-y-3">
          {/* Export */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportXlsx}
              disabled={configuredRooms.length === 0}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              <FileSpreadsheet size={15} />
              Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={configuredRooms.length === 0}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              <FileText size={15} />
              PDF
            </button>
          </div>

          {/* Totale + link carrello */}
          <div className="rounded-xl bg-stone-800 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <span className="text-sm">Totale</span>
              <span className="text-lg font-bold">{totalEur.toFixed(2)} €</span>
            </div>
            <div className="mt-0.5 text-xs text-stone-400">{totalPacks} confezioni attive</div>
          </div>

          <button
            onClick={() => { navigate('/progetto/carrello'); onClose(); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Gestisci carrello completo
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
