import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Benvenuto, {user?.displayName}
        </h1>
        <p className="mt-2 text-gray-500">
          Configuratore ordini pre-cantiere · Nativus Resine
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(user?.role === 'rivenditore' || user?.role === 'admin' || user?.role === 'applicatore') && (
          <DashCard
            title="Progetto / Configuratore"
            description="Aggiungi ambienti, configura supporti e texture, genera il carrello con tutti i materiali."
            to="/progetto"
            accent="brand"
          />
        )}
        {user?.role === 'admin' && (
          <DashCard
            title="Pannello Admin"
            description="Gestione catalogo, prezzi e regole."
            to="/admin"
            accent="gray"
          />
        )}
      </div>
    </div>
  );
}

interface DashCardProps {
  title: string;
  description: string;
  to: string;
  accent: 'brand' | 'gray';
}

function DashCard({ title, description, to, accent }: DashCardProps) {
  const bg = accent === 'brand' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-gray-700 hover:bg-gray-800';
  return (
    <Link
      to={to}
      className={`card flex flex-col gap-3 p-6 text-white transition-colors ${bg}`}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm opacity-80">{description}</p>
      <span className="mt-auto text-sm font-medium opacity-90">Avvia →</span>
    </Link>
  );
}
