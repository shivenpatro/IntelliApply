import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthVanillaAdapter } from '@neondatabase/auth/vanilla';

export const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || '/neon-auth';
const authClient = createAuthClient(NEON_AUTH_URL, { adapter: BetterAuthVanillaAdapter({ fetchOptions: { timeout: 15000 } }) });
const SESSION_KEY = 'neon_auth_session';
const AUTH_TIMEOUT_MS = 15000;
export interface NeonAuthUser {
  id: string; email: string; name: string; image?: string | null;
  emailVerified: boolean; createdAt: string | Date; updatedAt: string | Date;
}
export interface NeonAuthSession { token: string; user: NeonAuthUser; expiresAt?: string; }
type AuthCallback = (event: string, session: NeonAuthSession | null) => void;
const listeners = new Set<AuthCallback>();
let epoch = 0;
let memorySession: NeonAuthSession | null = null;
let sessionForced = false;
let sessionRequest: Promise<{ data: { session: NeonAuthSession | null }; error: Error | null }> | null = null;
function tokenExpiry(token: string): number {
  try {
    const raw = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(raw));
    return typeof claims.exp === 'number' ? claims.exp * 1000 : 0;
  } catch { return 0; }
}
function isCurrent(session: NeonAuthSession | null): session is NeonAuthSession {
  return !!session?.user?.id && typeof session.token === 'string' &&
    tokenExpiry(session.token) > Date.now() + 5000 &&
    (!session.expiresAt || Date.parse(session.expiresAt) > Date.now());
}
function loadSession(): NeonAuthSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (isCurrent(parsed)) return parsed;
    localStorage.removeItem(SESSION_KEY);
  } catch { /* Private browsers may disable persistent storage. */ }
  return null;
}
function saveSession(token: string, user: NeonAuthUser): NeonAuthSession {
  const session = { token, user, expiresAt: new Date(tokenExpiry(token)).toISOString() };
  if (!isCurrent(session)) throw new Error('Your session has expired. Please sign in again.');
  memorySession = session;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Memory session remains usable. */ }
  return session;
}
export function notifyAuthChange(event: string, session: NeonAuthSession | null) {
  listeners.forEach(callback => callback(event, session));
}
export function clearLocalSession() {
  epoch += 1;
  memorySession = null;
  try { localStorage.removeItem(SESSION_KEY); } catch { /* No persistent storage. */ }
  notifyAuthChange('SIGNED_OUT', null);
}
async function bounded<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Authentication request timed out. Please try again.')), AUTH_TIMEOUT_MS);
  });
  try { return await Promise.race([request, timeout]); }
  finally { clearTimeout(timer!); }
}
function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Authentication could not be completed.');
}
async function authenticate(email: string, password: string, signup: boolean) {
  const version = ++epoch;
  try {
    const result = await bounded(signup
      ? authClient.signUp.email({ email, password, name: email.split('@')[0] }, { timeout: AUTH_TIMEOUT_MS })
      : authClient.signIn.email({ email, password }, { timeout: AUTH_TIMEOUT_MS }));
    if (result.error) throw new Error(result.error.message || 'Authentication failed.');
    const user = result.data?.user as NeonAuthUser | undefined;
    const token = user ? (await bounded(authClient.getSession())).data?.session?.token : null;
    if (version !== epoch) throw new Error('Authentication was cancelled. Please try again.');
    if (user && token) return { data: { user, session: saveSession(token, user) }, error: null };
    if (signup && user) return { data: { user, session: null }, error: null };
    throw new Error('No active session returned. Please sign in again.');
  } catch (error) { return { data: { user: null, session: null }, error: asError(error) }; }
}
export const signUp = (email: string, password: string) => authenticate(email, password, true);
export const signIn = (email: string, password: string) => authenticate(email, password, false);
export const signInWithGoogle = async () => {
  try {
    const { error } = await bounded(authClient.signIn.social({ provider: 'google', callbackURL: `${window.location.origin}/auth/callback` }, { timeout: AUTH_TIMEOUT_MS }));
    if (error) throw new Error(error.message);
    return { error: null };
  } catch (error) { return { error: asError(error) }; }
};
export const signOut = async () => {
  clearLocalSession();
  try { await bounded(authClient.signOut({}, { timeout: AUTH_TIMEOUT_MS })); return { error: null }; }
  catch { return { error: new Error('Signed out on this device. The remote session could not be closed.') }; }
};
export const getSession = (options: { force?: boolean } = {}): Promise<{ data: { session: NeonAuthSession | null }; error: Error | null }> => {
  if (sessionRequest) {
    if (!options.force || sessionForced) return sessionRequest;
    return sessionRequest.then(() => getSession(options));
  }
  sessionForced = !!options.force;
  const version = epoch;
  sessionRequest = (async () => {
    try {
      const { data, error } = await bounded(authClient.getSession({ fetchOptions: { timeout: AUTH_TIMEOUT_MS, headers: options.force ? { 'X-Force-Fetch': 'true' } : undefined } }));
      if (error) throw new Error(error.message);
      if (version !== epoch) return { data: { session: null }, error: null };
      if (data?.user) {
        const token = data.session?.token;
        if (version !== epoch) return { data: { session: null }, error: null };
        if (token) return { data: { session: saveSession(token, data.user as NeonAuthUser) }, error: null };
      }
      clearLocalSession();
      return { data: { session: null }, error: null };
    } catch (error) {
      if (version !== epoch) return { data: { session: null }, error: null };
      const cached = memorySession || loadSession();
      if (!options.force && version === epoch && isCurrent(cached)) return { data: { session: cached }, error: asError(error) };
      clearLocalSession();
      return { data: { session: null }, error: asError(error) };
    }
  })().finally(() => { sessionRequest = null; });
  return sessionRequest;
};
export const getCurrentUser = async () => {
  const { data } = await getSession();
  return { data: { user: data.session?.user || null }, error: null };
};
export const getAccessToken = (): string | null => {
  const session = memorySession || loadSession();
  return isCurrent(session) ? session.token : null;
};
export const onAuthStateChange = (callback: AuthCallback) => {
  listeners.add(callback);
  return { data: { subscription: { unsubscribe: () => { listeners.delete(callback); } } } };
};
export const requestPasswordReset = async (email: string) => {
  const { error } = await bounded(authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/update-password` }, { timeout: AUTH_TIMEOUT_MS }));
  if (error) throw new Error(error.message || 'Failed to send reset email. Please try again.');
};

export async function resetPassword(token: string, newPassword: string) {
  const { error } = await bounded(authClient.resetPassword({ token, newPassword }, { timeout: AUTH_TIMEOUT_MS }));
  if (error) throw new Error(error.message || 'Could not reset password. Please request a new link.');
  clearLocalSession();
}

window.addEventListener('storage', event => {
  if (event.key !== SESSION_KEY) return;
  if (!event.newValue) clearLocalSession();
  else void getSession({ force: true }).then(({ data }) => notifyAuthChange(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session));
});
