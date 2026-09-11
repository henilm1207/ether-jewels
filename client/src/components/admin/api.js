import { apiUrl } from '../../config';

// Thin admin API client — attaches the admin JWT, throws Error(message) on failure.
// Every request carries a timeout so a stalled server can never hang the UI forever.
const DEFAULT_TIMEOUT_MS = 30000;

export async function adminFetch(path, { method = 'GET', body, form, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let token = null;
  try {
    token = localStorage.getItem('ether-token');
  } catch { /* private mode */ }
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form; // FormData — browser sets Content-Type
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(path), { method, headers, body: payload, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  } catch (e) {
    if (e && e.name === 'AbortError')
      throw new Error('Request timed out — is the API server running? Try again.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function useAdminUser() {
  const { user } = useAuth();
  return user && user.role === 'admin' ? user : null;
}
