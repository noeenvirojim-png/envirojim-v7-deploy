import { User, UserRole } from './schema';

export type { User, UserRole };

export interface AuthSession {
  user: User | null;
  expires: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}
