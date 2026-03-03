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
        {(user?.role === 'applicatore' || user?.role === 'admin') && (
          <DashCard
            title="Cantiere"
            description="Configurazione tecnica completa: supporti, stratigrafie, consumi reali e procedura operativa."
            to="/applicatore"
            accent="dark"
          />
        )}
        {(user?.role === 'rivenditore' || user?.role === 'admin') && (
          <DashCard
            title="Preventivo"
            description="Configurazione commerciale: ambienti, texture, ottimizzazione confezioni e totale preventivo."
            to="/rivenditore"
            accent="brand"
          />
        )}
        {(user?.role === 'progettista' || user?.role === 'admin') && (
          <DashCard
            title="Specifiche Tecniche"
            description="Documentazione progettuale: stratigrafie, DIN, specifiche tecniche senza prezzi."
            to="/progettista"
            accent="stone"
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
  accent: 'brand' | 'gray' | 'dark' | 'stone';
}

function DashCard({ title, description, to, accent }: DashCardProps) {
  const styles = {
    brand: 'bg-brand-600 hover:bg-brand-700',
    gray: 'bg-gray-700 hover:bg-gray-800',
    dark: 'bg-slate-800 hover:bg-slate-700',
    stone: 'bg-stone-700 hover:bg-stone-600',
  };
  return (
    <Link
      to={to}
      className={`card flex flex-col gap-3 p-6 text-white transition-colors ${styles[accent]}`}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm opacity-80">{description}</p>
      <span className="mt-auto text-sm font-medium opacity-90">Avvia →</span>
    </Link>
  );
}
