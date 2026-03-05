/**
 * Neon Auth (Better Auth) client library.
 *
 * Handles sign-up, sign-in, sign-out, and session management
 * by talking directly to the Neon Auth REST API.
 *
 * Zero Supabase dependency — fully migrated to Neon.
 */

// ─── Neon Auth Configuration ────────────────────────────────────────────────
const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth';

// ─── Session storage helpers ─────────────────────────────────────────────────
const SESSION_KEY = 'neon_auth_session';

export interface NeonAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
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
  // Also clear any leftover Supabase/old auth keys
  Object.keys(localStorage).forEach((key) => {
    if (key.includes('supabase') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
}

// ─── Auth API calls to Neon Auth ─────────────────────────────────────────────

export const signUp = async (email: string, password: string) => {
  try {
    console.log(`[NeonAuth] Signing up: ${email}`);

    const response = await fetch(`${NEON_AUTH_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: email.split('@')[0], // Default name from email
      }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.message || data?.error || `Registration failed (${response.status})`;
      console.error('[NeonAuth] Sign up error:', errorMessage);
      return { data: { user: null, session: null }, error: new Error(errorMessage) };
    }

    console.log('[NeonAuth] Sign up successful:', data);

    const user: NeonAuthUser = data.user;
    const token: string = data.token || data.session?.token || '';

    if (user && token) {
      const session: NeonAuthSession = { token, user };
      saveSession(session);
      return { data: { user, session }, error: null };
    }

    // If sign-up succeeded but no immediate session (email verification required)
    return { data: { user: data.user || null, session: null }, error: null };
  } catch (error) {
    console.error('[NeonAuth] signUp exception:', error);
    return { data: { user: null, session: null }, error: error as Error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log(`[NeonAuth] Signing in: ${email}`);

    const response = await fetch(`${NEON_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.message || data?.error || `Login failed (${response.status})`;
      console.error('[NeonAuth] Sign in error:', errorMessage);
      return { data: { user: null, session: null }, error: new Error(errorMessage) };
    }

    console.log('[NeonAuth] Sign in successful:', data);

    const user: NeonAuthUser = data.user;
    const token: string = data.token || data.session?.token || '';

    if (user && token) {
      const session: NeonAuthSession = { token, user };
      saveSession(session);
      return { data: { user, session }, error: null };
    }

    return { data: { user: null, session: null }, error: new Error('No session returned') };
  } catch (error) {
    console.error('[NeonAuth] signIn exception:', error);
    return { data: { user: null, session: null }, error: error as Error };
  }
};

export const signOut = async () => {
  try {
    console.log('[NeonAuth] Signing out...');

    const session = loadSession();
    if (session?.token) {
      try {
        await fetch(`${NEON_AUTH_URL}/api/auth/sign-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          credentials: 'include',
        });
      } catch (e) {
        console.warn('[NeonAuth] Server-side sign-out failed (non-critical):', e);
      }
    }

    clearSession();
    return { error: null };
  } catch (error) {
    console.error('[NeonAuth] signOut exception:', error);
    clearSession();
    return { error: null };
  }
};

export const getSession = async () => {
  const session = loadSession();
  if (session) {
    return { data: { session }, error: null };
  }
  return { data: { session: null }, error: null };
};

export const getCurrentUser = async () => {
  const session = loadSession();
  if (session?.user) {
    return { data: { user: session.user }, error: null };
  }
  return { data: { user: null }, error: null };
};

/**
 * Get the current access token for API requests.
 * Used by the axios interceptor in api.ts.
 */
export const getAccessToken = (): string | null => {
  const session = loadSession();
  return session?.token || null;
};

// Auth state change listener (simplified — polls localStorage)
type AuthCallback = (event: string, session: NeonAuthSession | null) => void;
const listeners: Set<AuthCallback> = new Set();

export const onAuthStateChange = (callback: AuthCallback) => {
  listeners.add(callback);

  // Immediately fire with current state
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

// Notify all listeners when auth state changes
export function notifyAuthChange(event: string, session: NeonAuthSession | null) {
  listeners.forEach((cb) => cb(event, session));
}
