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
      const dest = from ?? (user ? ROLE_TO_HOME[user.role] ?? '/' : '/');
      navigate(dest, { replace: true });
    } else {
      setError(result.error ?? 'Errore di accesso.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-brand-800">Nativus</h1>
          <p className="mt-2 text-sm text-gray-500">Configuratore Ordini</p>
        </div>

        <form className="card space-y-6 p-8" onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-gray-800">Accesso</h2>

          {error && (
            <div className="alert-hard" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="input-field mt-1"
              placeholder="es. rivenditore"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input-field mt-1"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Accedi
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Demo: admin/admin123 · rivenditore/riv123 · applicatore/app123 · progettista/prog123
        </p>
      </div>
    </div>
  );
}
