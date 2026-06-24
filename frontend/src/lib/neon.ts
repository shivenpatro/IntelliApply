/**
 * Neon Auth (Better Auth) client library.
 *
 * Uses the official @neondatabase/auth SDK to seamlessly handle
 * OAuth callbacks, third-party cookie bypasses, and session state.
 */

import { createInternalNeonAuth } from '@neondatabase/auth';

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth';

// Initialize the official Neon Auth SDK
const neonAuth = createInternalNeonAuth(NEON_AUTH_URL);
const authClient = neonAuth.adapter;

const SESSION_KEY = 'neon_auth_session';

export interface NeonAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface NeonAuthSession {
  token: string;
  user: NeonAuthUser;
  expiresAt?: string;
}

function saveSession(session: NeonAuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): NeonAuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NeonAuthSession;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Keep a local cached token for synchronous access by axios
let memoryToken: string | null = loadSession()?.token || null;

export const signUp = async (email: string, password: string) => {
  try {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0],
    });

    if (error) {
      return { data: { user: null, session: null }, error: new Error(error.message) };
    }

    const jwtToken = await neonAuth.getJWTToken();
    if (data?.user && jwtToken) {
      memoryToken = jwtToken;
      const session = { token: jwtToken, user: data.user as NeonAuthUser };
      saveSession(session);
      return { data: { user: data.user as NeonAuthUser, session }, error: null };
    }

    return { data: { user: data?.user as NeonAuthUser || null, session: null }, error: null };
  } catch (error) {
    return { data: { user: null, session: null }, error: error as Error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await authClient.signIn.email({ email, password });

    if (error) {
      return { data: { user: null, session: null }, error: new Error(error.message) };
    }

    const jwtToken = await neonAuth.getJWTToken();
    if (data?.user && jwtToken) {
      memoryToken = jwtToken;
      const session = { token: jwtToken, user: data.user as NeonAuthUser };
      saveSession(session);
      return { data: { user: data.user as NeonAuthUser, session }, error: null };
    }

    return { data: { user: null, session: null }, error: new Error('No session returned') };
  } catch (error) {
    return { data: { user: null, session: null }, error: error as Error };
  }
};

export const signInWithGoogle = async () => {
  try {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    // Better Auth normally redirects automatically on social sign in!
    return { error: null };
  } catch (error) {
    console.error('[NeonAuth] signInWithGoogle exception:', error);
    return { error: error as Error };
  }
};

export const signOut = async () => {
  try {
    await authClient.signOut();
    memoryToken = null;
    clearSession();
    return { error: null };
  } catch {
    memoryToken = null;
    clearSession();
    return { error: null };
  }
};

export const getSession = async () => {
  try {
    const { data } = await authClient.getSession();
    
    if (data?.user) {
      const jwtToken = await neonAuth.getJWTToken();
      if (jwtToken) {
        memoryToken = jwtToken;
        const session = { token: jwtToken, user: data.user as NeonAuthUser };
        saveSession(session);
        return { data: { session }, error: null };
      }
    }
  } catch (e) {
    console.warn('[NeonAuth] Failed to get session', e);
  }

  const session = loadSession();
  if (session) {
    memoryToken = session.token;
    return { data: { session }, error: null };
  }
  return { data: { session: null }, error: null };
};

export const getCurrentUser = async () => {
  const { data } = await getSession();
  if (data?.session?.user) {
    return { data: { user: data.session.user }, error: null };
  }
  return { data: { user: null }, error: null };
};

export const getAccessToken = (): string | null => {
  return memoryToken || loadSession()?.token || null;
};

type AuthCallback = (event: string, session: NeonAuthSession | null) => void;
const listeners: Set<AuthCallback> = new Set();

export const onAuthStateChange = (callback: AuthCallback) => {
  listeners.add(callback);

  const session = loadSession();
  callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);

  return {
    data: {
      subscription: {
        unsubscribe: () => {
          listeners.delete(callback);
        },
      },
    },
  };
};

export function notifyAuthChange(event: string, session: NeonAuthSession | null) {
  listeners.forEach((cb) => cb(event, session));
}
