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
    <header className="nativus-nav sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8" style={{ height: 64 }}>
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link
            to={homeLink}
            className="flex items-center gap-3"
            style={{ textDecoration: 'none' }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#171e29',
              }}
            >
              Nativus
            </span>
            <span
              style={{
                width: 1,
                height: 16,
                backgroundColor: '#d8d9d6',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#8b8f94',
              }}
            >
              Configuratore
            </span>
          </Link>

          {/* Nav links */}
          {user && (
            <nav className="hidden sm:flex items-center gap-1">
              {(user.role === 'applicatore' || user.role === 'admin') && (
                <NavLink to="/applicatore" className={navLinkClass}>
                  Cantiere
                </NavLink>
              )}
              {(user.role === 'rivenditore' || user.role === 'admin') && (
                <NavLink to="/rivenditore" className={navLinkClass}>
                  Preventivo
                </NavLink>
              )}
              {(user.role === 'progettista' || user.role === 'admin') && (
                <NavLink to="/progettista" className={navLinkClass}>
                  Specifiche
                </NavLink>
              )}
              {user.role === 'admin' && (
                <NavLink to="/progetto" className={navLinkClass}>
                  Progetto
                </NavLink>
              )}
              {(user.role === 'admin' || user.role === 'rivenditore' || user.role === 'applicatore') && (
                <NavLink to="/configuratore" className={navLinkClass}>
                  Wizard
                </NavLink>
              )}
              {user.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
            </nav>
          )}
        </div>

        {/* User area */}
        {user && (
          <div className="flex items-center gap-4">
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: '0.04em',
                color: '#445164',
              }}
            >
              {user.displayName}
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  border: '1px solid #d8d9d6',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#8b8f94',
                }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: '1px solid #d8d9d6',
                background: 'transparent',
                color: '#445164',
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#171e29';
                (e.currentTarget as HTMLButtonElement).style.color = '#171e29';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#d8d9d6';
                (e.currentTarget as HTMLButtonElement).style.color = '#445164';
              }}
            >
              Esci
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-ink-700 border-b border-ink-700'
    : 'px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-stone-400 hover:text-ink-700 transition-colors border-b border-transparent hover:border-ink-700';
}
