// Shared write-path primitives for the account sync engines (bag + wishlist).
//
// The 500/429 storms came from overlapping mutating requests: each
// fetch-modify-save cycle on one server doc collides with the next
// (VersionError -> generic 500), and every failure loop scheduled its own
// independent retries into one shared 20/min limiter bucket. These helpers
// enforce: at most one mutating request in flight per collection (queue),
// no duplicate concurrent ops per key (dedupe), and bounded retries with
// backoff that respect the server's Retry-After hint.
export const RETRIABLE_STATUS = new Set([409, 429, 500, 502, 503, 504]);

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const backoffMs = (attempt) =>
  Math.min(8000, 700 * 2 ** attempt * (0.7 + Math.random() * 0.6));

export const retryAfterMs = (res) => {
  try {
    const raw = res && res.headers && typeof res.headers.get === 'function'
      ? res.headers.get('Retry-After')
      : null;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.min(10000, n * 1000);
  } catch {
    // header unreadable — fall through to backoff
  }
  return null;
};

// FIFO mutex for mutating requests: each fn starts only after the previous
// settles. Reads stay parallel; the queue never breaks on rejection.
export const createWriteQueue = () => {
  let tail = Promise.resolve();
  return (fn) => {
    const run = tail.then(fn, fn);
    tail = run.catch(() => {});
    return run;
  };
};

// Per-key in-flight dedupe: a second call for the same key awaits the first
// instead of firing a duplicate request (rapid double-clicks).
export const createOpDedupe = () => {
  const pending = new Map();
  return (key, fn) => {
    const existing = pending.get(key);
    if (existing) return existing;
    const p = (async () => {
      try {
        return await fn();
      } finally {
        if (pending.get(key) === p) pending.delete(key);
      }
    })();
    pending.set(key, p);
    return p;
  };
};

// Fetch with bounded retries on retriable statuses and network failures.
// Whole-state PUT payloads are idempotent so replay is safe; move POSTs rely
// on the caller's verify-after-write. Returns the final response (callers
// keep their !ok handling); throws only when no response was ever received.
export const fetchWrite = async (url, options, { attempts = 3 } = {}) => {
  let lastRes = null;
  let lastErr = null;
  for (let a = 0; a <= attempts; a++) {
    if (a > 0) {
      const hinted = lastRes ? retryAfterMs(lastRes) : null;
      await delay(hinted != null ? hinted : backoffMs(a - 1));
    }
    try {
      const res = await fetch(url, options);
      if (!RETRIABLE_STATUS.has(res.status)) return res;
      lastRes = res;
      lastErr = null;
    } catch (e) {
      lastErr = e;
      lastRes = null;
    }
  }
  if (lastRes) return lastRes;
  throw lastErr || new Error('Network request failed');
};
