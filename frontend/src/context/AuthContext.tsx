import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthSession, User } from '@supabase/supabase-js';
import { signIn, signUp, signOut, getSession, getCurrentUser, onAuthStateChange } from '../lib/supabase';
import { profileAPI } from '../services/api'; // Import profileAPI

interface AuthContextType {
    user: User | null;
    session: AuthSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // On mount, check for existing session
    getSession().then(({ data, error }) => {
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        setIsAuthenticated(true);
        // We will fetch profile in a separate effect hook based on isAuthenticated
      } else {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });
    // Listen for auth state changes
    const { data: listener } = onAuthStateChange((event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
         // We will fetch profile in a separate effect hook based on isAuthenticated
      } else {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // New effect hook to fetch profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user) { // Check user as well to ensure we have the ID
      console.log("[AuthContext] isAuthenticated is true. Attempting to fetch profile...");
      profileAPI.getProfile().catch(err => {
        console.error("[AuthContext] Failed to fetch profile when isAuthenticated changed:", err);
        // Optionally handle error
      });
    }
  }, [isAuthenticated, user]); // Depend on isAuthenticated and user

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await signUp(email, password);
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    session,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
