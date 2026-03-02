import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useProjectStore } from '../../store/project-store';

interface CartFloatingBtnProps {
  onClick: () => void;
}

export function CartFloatingBtn({ onClick }: CartFloatingBtnProps) {
  const cart = useProjectStore(s => s.cart);
  const activeCount = cart.filter(r => r.status === 'active').reduce((a, r) => a + r.qty_packs, 0);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-stone-800 text-white shadow-lg hover:bg-stone-700 active:scale-95 transition-transform"
      aria-label="Apri carrello"
    >
      <ShoppingCart size={22} />
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white shadow">
          {activeCount > 99 ? '99+' : activeCount}
        </span>
      )}
    </button>
  );
}
