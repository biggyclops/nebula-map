/**
 * Scheme-aware URL builders for API and WebSocket.
 * Ensures HTTPS page uses https:// and wss:// (no Mixed Content).
 *
 * Env overrides (optional):
 * - VITE_API_ORIGIN: e.g. https://api.example.com (default: same-origin)
 * - VITE_WS_ORIGIN: e.g. wss://api.example.com (default: wss when page is https)
 */

export function getApiBase(): string {
  try {
    const env = (import.meta as any).env;
    if (env?.VITE_API_ORIGIN && typeof env.VITE_API_ORIGIN === 'string') {
      return env.VITE_API_ORIGIN.replace(/\/$/, '');
    }
  } catch {}
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return ''; // SSR/build fallback: relative URLs
}

export function getWsBase(): string {
  try {
    const env = (import.meta as any).env;
    if (env?.VITE_WS_ORIGIN && typeof env.VITE_WS_ORIGIN === 'string') {
      return env.VITE_WS_ORIGIN.replace(/\/$/, '');
    }
  } catch {}
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost';
}
