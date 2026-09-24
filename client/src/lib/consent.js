// Tracking consent (cookie banner) — single source of truth.
// Third-party scripts (analytics, payment gateway SDKs) must only load after
// an explicit 'accepted' choice. Choice lives in localStorage; every change
// broadcasts CONSENT_EVENT so open pages react immediately.
export const CONSENT_KEY = 'etherstar-cookie-consent';
export const CONSENT_EVENT = 'etherstar-consent';
const CONSENT_TTL_MS = 180 * 24 * 3600 * 1000; // re-prompt after 180 days

export function getConsentChoice() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return null;
    if (Date.now() - Number(parsed.ts || 0) > CONSENT_TTL_MS) return null;
    return parsed.choice || null;
  } catch {
    return null;
  }
}

export function hasTrackingConsent() {
  return getConsentChoice() === 'accepted';
}

export function setTrackingConsent(choice) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, choice, ts: Date.now() }));
  } catch {
    // private mode — choice applies to this tab only
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
