import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { ROLE_TO_HOME } from '../types/roles';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = login({ username, password });
    if (result.success) {
      const user = useAuthStore.getState().user;
      const dest = from ?? (user ? ROLE_TO_HOME[user.role] ?? '/progetto' : '/progetto');
      navigate(dest, { replace: true });
    } else {
      setError(result.error ?? 'Errore di accesso.');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #0d1219 0%, #171e29 45%, #1f2c3a 75%, #151c27 100%)',
      }}
    >
      {/* Left panel — brand hero */}
      <div
        style={{
          flex: 1,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          position: 'relative',
        }}
        className="lg:flex"
      >
        {/* Dot texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 400 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 20,
            }}
          >
            Resine Nativus
          </p>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 300,
              letterSpacing: '0.06em',
              color: '#ffffff',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Configuratore
            <br />
            <span style={{ fontWeight: 600 }}>Ordini</span>
          </h1>
          <p
            style={{
              marginTop: 20,
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.03em',
              lineHeight: 1.7,
            }}
          >
            Sistema professionale per la configurazione di sistemi in resina decorativa.
          </p>

          <div
            style={{
              marginTop: 48,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {['Calcolo consumi ufficiali', 'Ottimizzazione confezioni', 'Export tecnico e commerciale'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 18,
                    height: 1,
                    background: 'rgba(255,255,255,0.3)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 40px',
          background: '#f2f2f0',
        }}
      >
        {/* Mobile-only brand */}
        <div style={{ marginBottom: 36 }} className="lg:hidden">
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#9a9a96',
              marginBottom: 6,
            }}
          >
            Resine Nativus
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '0.05em',
              color: '#171e29',
              margin: 0,
            }}
          >
            Configuratore Ordini
          </h1>
        </div>

        <div style={{ marginBottom: 32 }}>
          <p className="surtitle" style={{ marginBottom: 10 }}>Accesso</p>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#171e29',
              margin: 0,
            }}
          >
            Benvenuto
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div className="alert-hard" role="alert">
              {error}
            </div>
          )}

          <div>
            <label className="label-text" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="input-field"
              placeholder="es. admin"
              style={{ marginTop: 0 }}
            />
          </div>

          <div>
            <label className="label-text" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input-field"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
            Accedi
          </button>
        </form>

        <p
          style={{
            marginTop: 32,
            fontSize: 10,
            color: '#b8b8b4',
            letterSpacing: '0.04em',
            lineHeight: 1.7,
          }}
        >
          Demo: admin / admin123 · rivenditore / riv123<br />
          applicatore / app123 · progettista / prog123
        </p>
      </div>
    </div>
  );
}
