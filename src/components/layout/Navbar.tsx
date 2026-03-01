import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  rivenditore: 'Rivenditore',
  applicatore: 'Applicatore',
};

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-700">Nativus</span>
            <span className="hidden text-sm text-gray-400 sm:inline">Configuratore Ordini</span>
          </Link>

          {user && (
            <nav className="hidden sm:flex items-center gap-1">
              <NavLink
                to="/configuratore"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                Configuratore
              </NavLink>
              {(user.role === 'admin' || user.role === 'rivenditore') && (
                <NavLink
                  to="/progetto"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:text-gray-900'}`
                  }
                >
                  Progetto
                </NavLink>
              )}
              {user.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:text-gray-900'}`
                  }
                >
                  Admin
                </NavLink>
              )}
            </nav>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              <span className="font-medium">{user.displayName}</span>
              {' '}
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </span>
            <button onClick={handleLogout} className="btn-secondary py-1.5 text-xs">
              Esci
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
