import { createContext, useContext } from 'react';
import type { NeonAuthUser, NeonAuthSession } from '../lib/neon';
export interface AuthContextType {
  user: NeonAuthUser | null; session: NeonAuthSession | null; isAuthenticated: boolean;
  loading: boolean; error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>; logout: () => Promise<void>; clearError: () => void;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
