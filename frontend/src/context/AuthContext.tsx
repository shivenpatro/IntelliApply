import { useState, useEffect, type ReactNode } from 'react';
import { signIn, signUp, signOut, signInWithGoogle, getSession, onAuthStateChange, notifyAuthChange, type NeonAuthSession } from '../lib/neon';
import { errorMessage } from '../lib/errors';
import { AuthContext } from './auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<NeonAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true; let changes = 0;
    const listener = onAuthStateChange((_event, updated) => { changes++; if (mounted) { setSession(updated); setLoading(false); } });
    getSession().then(({ data }) => { if (mounted && changes === 0) { setSession(data.session); setLoading(false); } });
    return () => { mounted = false; listener.data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!session?.expiresAt) return;
    const timeout = Math.max(1000, Math.min(2147483647, Date.parse(session.expiresAt) - Date.now() - 5000));
    const timer = setTimeout(() => { void getSession({ force: true }).then(({ data }) => setSession(previous => previous?.token === session.token ? data.session : previous)); }, timeout);
    return () => clearTimeout(timer);
  }, [session]);
  const login = async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const result = await signIn(email, password);
      if (result.error) throw result.error;
      if (!result.data.session) throw new Error('Please sign in again.');
      setSession(result.data.session); notifyAuthChange('SIGNED_IN', result.data.session);
    } catch (err) { setError(errorMessage(err)); throw err; }
    finally { setLoading(false); }
  };
  const register = async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const result = await signUp(email, password);
      if (result.error) throw result.error;
      if (result.data.session) { setSession(result.data.session); notifyAuthChange('SIGNED_IN', result.data.session); }
      return !!result.data.session;
    } catch (err) { setError(errorMessage(err)); throw err; }
    finally { setLoading(false); }
  };
  const loginWithGoogle = async () => {
    setLoading(true); setError(null);
    try { const result = await signInWithGoogle(); if (result.error) throw result.error; }
    catch (err) { setError(errorMessage(err)); throw err; }
    finally { setLoading(false); }
  };
  const logout = async () => {
    const result = await signOut(); setSession(null);
    if (result.error) setError(result.error.message);
  };
  return <AuthContext.Provider value={{user:session?.user || null,session,isAuthenticated:!!session,loading,error,login,register,loginWithGoogle,logout,clearError:() => setError(null)}}>{children}</AuthContext.Provider>;
}
