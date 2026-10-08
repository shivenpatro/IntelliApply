import axios from 'axios';
export function errorMessage(error: unknown, fallback = 'The request could not be completed. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(item => String(item.msg || 'Invalid input')).join('. ');
  }
  return error instanceof Error ? error.message : fallback;
}
export function retryAfter(error: unknown): number {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) return 0;
  const value = error.response.headers['retry-after'];
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(1, seconds) : Math.max(1, (Date.parse(value) - Date.now()) / 1000 || 60);
}
