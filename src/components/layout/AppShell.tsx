import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { CartFloatingBtn } from './CartFloatingBtn';
import { CartDrawer } from './CartDrawer';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const showCart = location.pathname.startsWith('/progetto');
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {showCart && (
        <>
          <CartFloatingBtn onClick={() => setDrawerOpen(true)} />
          <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </>
      )}
    </div>
  );
}
