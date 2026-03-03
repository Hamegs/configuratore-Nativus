import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';

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

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e8e8e6',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: 60,
        }}
      >
        {/* Brand + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          <Link
            to="/progetto"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: '#171e29',
              }}
            >
              Nativus
            </span>
            <span
              style={{
                width: 1,
                height: 14,
                backgroundColor: '#d4d4d2',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: '#9a9a96',
              }}
            >
              Configuratore
            </span>
          </Link>

          {/* Nav — only Progetti + Admin */}
          {user && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <NavLink to="/progetto" end style={navStyle}>
                Progetti
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" style={navStyle}>
                  Admin
                </NavLink>
              )}
            </nav>
          )}
        </div>

        {/* User area */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: '0.02em',
                color: '#6b6b67',
              }}
            >
              {user.displayName}
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 7px',
                  border: '1px solid #e0e0de',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#9a9a96',
                }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </span>
            <NavLogoutBtn onClick={handleLogout} />
          </div>
        )}
      </div>
    </header>
  );
}

function navStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: isActive ? 600 : 400,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: isActive ? '#171e29' : '#9a9a96',
    textDecoration: 'none',
    borderBottom: isActive ? '1.5px solid #171e29' : '1.5px solid transparent',
    transition: 'all 0.15s',
  };
}

function NavLogoutBtn({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        border: hover ? '1px solid #171e29' : '1px solid #d4d4d2',
        background: 'transparent',
        color: hover ? '#171e29' : '#6b6b67',
        padding: '5px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      Esci
    </button>
  );
}
