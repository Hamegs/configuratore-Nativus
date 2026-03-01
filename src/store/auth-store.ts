import { create } from 'zustand';
import type { User, UserRole, AuthState, LoginCredentials } from '../types/auth';

const STATIC_USERS: Array<User & { password: string }> = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin', displayName: 'Amministratore' },
  { id: '2', username: 'rivenditore', password: 'riv123', role: 'rivenditore', displayName: 'Rivenditore' },
  { id: '3', username: 'applicatore', password: 'app123', role: 'applicatore', displayName: 'Applicatore' },
];

const SESSION_KEY = 'nativus_auth';

interface AuthStore extends AuthState {
  login: (creds: LoginCredentials) => { success: boolean; error?: string };
  logout: () => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,

  login: (creds) => {
    const found = STATIC_USERS.find(
      u => u.username === creds.username && u.password === creds.password,
    );
    if (!found) {
      return { success: false, error: 'Credenziali non valide.' };
    }
    const user: User = { id: found.id, username: found.username, role: found.role, displayName: found.displayName };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
    return { success: true };
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY);
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: () => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const user = JSON.parse(raw) as User;
        set({ user, isAuthenticated: true });
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  },
}));

export function hasRole(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
