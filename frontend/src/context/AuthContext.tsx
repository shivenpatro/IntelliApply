import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthSession, User, AuthError } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, getSession, getCurrentUser } from '../lib/supabase';

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
  // We're using a loading state only for initial auth loading, not for operations
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session from Supabase
        const { data: { session } } = await getSession();
        setSession(session);

        if (session) {
          // Get user data if session exists
          const { data: { user } } = await getCurrentUser();
          setUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state changed: ${event}`);
        setSession(session);

        if (session) {
          const { data: { user } } = await getCurrentUser();
          setUser(user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }

        setLoading(false);
      }
    );

    initializeAuth();

    // Cleanup subscription
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);

      console.log('Starting login process for:', email);

      // Direct call to signIn
      const result = await signIn(email, password);

      console.log('Login result received:', result);

      // Check for errors
      if (result.error) {
        console.error('Login error from Supabase:', result.error);
        throw result.error;
      }

      // Verify we have user data
      if (!result.data?.user) {
        console.error('No user data returned from login');
        throw new Error('No user returned from authentication');
      }

      // Update auth state
      setUser(result.data.user);
      setSession(result.data.session);
      setIsAuthenticated(true);
      console.log('Login successful for:', result.data.user.email);

      return { success: true };
    } catch (error: any) {
      console.error('Login process error:', error);
      const errorMessage = error.message || 'Failed to log in';
      setError(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setError(null);

      console.log('Starting direct registration process for:', email);

      // Create a simple fetch request directly to Supabase API
      // This bypasses all the complex logic and potential issues
      const directResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          email,
          password,
          data: {
            confirmed_at: new Date().toISOString() // Attempt to pre-confirm the user
          },
        }),
      });

      console.log('Direct API response status:', directResponse.status);

      // Parse the response
      const responseData = await directResponse.json();
      console.log('Direct API response data:', responseData);

      // Check for errors in the direct API response
      if (!directResponse.ok || responseData.error) {
        const errorMsg = responseData.error?.message || 'Registration failed';
        console.error('Registration error from direct API:', errorMsg);
        throw new Error(errorMsg);
      }

      // If we get here, registration was successful
      if (responseData.user) {
        setUser(responseData.user);
        setSession(responseData.session);
        setIsAuthenticated(true);
        console.log('Registration successful with direct API');
      } else {
        console.warn('Registration completed but no user data returned from direct API');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Registration process error:', error);
      let errorMessage = error.message || 'Failed to register';

      // Provide more user-friendly error messages
      if (errorMessage.includes('timed out')) {
        errorMessage = 'Registration timed out. Please try again later.';
      } else if (errorMessage.includes('already registered') || errorMessage.includes('already been registered')) {
        errorMessage = 'This email is already registered. Please try logging in instead.';
      } else if (errorMessage.includes('Too many requests')) {
        errorMessage = 'Too many registration attempts. Please wait a moment and try again.';
      }

      setError(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
  };

  const logout = async () => {
    try {
      setError(null);

      console.log('Logging out user...');

      // Direct call to Supabase signOut
      const { error } = await signOut();

      if (error) {
        console.error('Error during signOut:', error);
        throw error;
      }

      // Clear all auth state
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);

      // Clear any local storage items related to auth
      localStorage.removeItem('supabase.auth.token');

      // Force redirect to home page
      console.log('Logout successful, redirecting to home page');
      window.location.href = '/';

      return { success: true };
    } catch (error) {
      const authError = error as AuthError;
      console.error('Logout error:', authError);
      setError(authError.message || 'Failed to log out');

      // Even if there's an error, clear the auth state and redirect
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      window.location.href = '/';
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    session,
    isAuthenticated,
    // Keep loading in the context for initial auth state loading
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
