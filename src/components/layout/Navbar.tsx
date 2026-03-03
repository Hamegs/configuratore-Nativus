import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { ROLE_TO_HOME } from '../../types/roles';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  rivenditore: 'Rivenditore',
  applicatore: 'Applicatore',
  progettista: 'Progettista',
};

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const homeLink = user ? (ROLE_TO_HOME[user.role] ?? '/') : '/';

  return (
    <header className="border-b border-brand-700 bg-brand-600 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to={homeLink} className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-widest text-white uppercase">Nativus</span>
            <span className="hidden text-xs text-brand-200 sm:inline font-light tracking-wide">Configuratore Ordini</span>
          </Link>

          {user && (
            <nav className="hidden sm:flex items-center gap-0.5">
              {/* Applicatore — technical dashboard */}
              {(user.role === 'applicatore' || user.role === 'admin') && (
                <NavLink
                  to="/applicatore"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                    }`
                  }
                >
                  Cantiere
                </NavLink>
              )}

              {/* Rivenditore — sales dashboard */}
              {(user.role === 'rivenditore' || user.role === 'admin') && (
                <NavLink
                  to="/rivenditore"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                    }`
                  }
                >
                  Preventivo
                </NavLink>
              )}

              {/* Progettista — spec dashboard */}
              {(user.role === 'progettista' || user.role === 'admin') && (
                <NavLink
                  to="/progettista"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                    }`
                  }
                >
                  Specifiche
                </NavLink>
              )}

              {/* Legacy project route for admin/rivenditore */}
              {user.role === 'admin' && (
                <NavLink
                  to="/progetto"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                    }`
                  }
                >
                  Progetto
                </NavLink>
              )}

              {(user.role === 'admin' || user.role === 'rivenditore' || user.role === 'applicatore') && (
                <NavLink
                  to="/configuratore"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                    }`
                  }
                >
                  Wizard
                </NavLink>
              )}

              {user.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                    }`
                  }
                >
                  Admin
                </NavLink>
              )}
            </nav>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-brand-100">
              <span className="font-medium text-white">{user.displayName}</span>
              {' '}
              <span className="rounded-full bg-sand-200 px-2 py-0.5 text-xs font-semibold text-brand-600">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-md border border-brand-300 bg-transparent px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Esci
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
