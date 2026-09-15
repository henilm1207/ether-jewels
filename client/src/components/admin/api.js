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

// Downloads a file from an admin-only endpoint (e.g. CSV export) — a plain
// <a href> can't carry the bearer token, so fetch as a blob and trigger the
// save via a temporary object URL.
export async function adminDownload(path, filename) {
  let token = null;
  try {
    token = localStorage.getItem('ether-token');
  } catch { /* private mode */ }
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || (match && match[1]) || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
