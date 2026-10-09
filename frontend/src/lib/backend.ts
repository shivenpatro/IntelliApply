export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';

// A single public warm-up starts a sleeping host before sign-in. It does not
// send identity information or claim that the database/providers are ready.
export const warmBackend = (signal: AbortSignal) => fetch(
  `${API_BASE_URL.replace(/\/+$/, '')}/health`,
  { signal, credentials: 'omit', cache: 'no-store' },
).then(() => undefined).catch(() => undefined);
