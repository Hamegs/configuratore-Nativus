export type UserRole = 'admin' | 'rivenditore' | 'applicatore';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
