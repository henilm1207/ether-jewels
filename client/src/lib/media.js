// Local media URL resolver — single source of truth for product imagery.
// Product.images[] stores ONLY relative local paths (/uploads/YYYY-MM/*.webp)
// plus legacy/external https:// URLs (paste-URL fallback, kept so unmigrated
// data keeps working). Relative paths resolve against the backend base URL
// (VITE_API_URL); absolute URLs pass through untouched.
import { API_BASE } from '../config';

export function resolveMediaUrl(src) {
  if (typeof src !== 'string' || !src) return src;
  if (src.startsWith('/uploads/')) return `${API_BASE}${src}`;
  return src;
}

// Matches a stored local upload (mirrors server/lib/localImages.js).
export const LOCAL_IMG_RE = /^\/uploads\/\d{4}-\d{2}\/[A-Za-z0-9-]+\.webp$/;

export function localFilename(src) {
  if (typeof src !== 'string') return null;
  const s = src.trim();
  if (!LOCAL_IMG_RE.test(s)) return null;
  return s.replace(/^\/uploads\//, '');
}
