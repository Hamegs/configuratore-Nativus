import React from 'react';
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-brand-600">403</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-800">Accesso non autorizzato</h1>
        <p className="mt-2 text-gray-500">Non hai i permessi necessari per questa pagina.</p>
        <Link to="/" className="btn-secondary mt-6 inline-flex">
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
