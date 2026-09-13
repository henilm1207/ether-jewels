import { useState, createContext, useContext, useEffect, useRef } from 'react';
import { apiUrl, MAX_CART_QTY } from '../config';
import { createWriteQueue, createOpDedupe, fetchWrite } from '../lib/writeSync';
import { useAuth } from './AuthContext';

const BagContext = createContext(null);
const STORAGE_KEY = 'etherstar-bag';
const GUEST_KEY = 'etherstar-bag-guest';
const syncedKeyFor = (userId) => `etherstar-bag-synced-${userId || 'anon'}`;
// Previous-generation keys — adopted once, then deleted (see upgradeLegacyStorage).
const LEGACY_MAIN = 'etherstar-cart';
const LEGACY_GUEST = 'etherstar-cart-guest';
const LEGACY_SYNCED_PREFIX = 'etherstar-cart-synced-';

// Amazon-style per-line cap (matches server MAX_QTY and lib/quote 1..10).
export const MAX_LINE_QTY = 10;

export const useBag = () => {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error('useBag must be used inside BagProvider');
  return ctx;
};

const sanitizeQty = (q) => {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_LINE_QTY, Math.max(1, n));
};

// Key identifies the buyable configuration (metal + karat + size) — never the
// price, so a price edit can't fork duplicate lines for the same choice.
const buildKey = (product, variant, size) =>
  `${product.slug}|${variant?.material || variant?.name || 'default'}|${variant?.kt || '14KT'}|${size || ''}`;

function sanitizeItem(it) {
  // Accept slug OR a product id: a stored line must never silently vanish
  // after reload just because its product snapshot is minimal.
  if (!it || typeof it.key !== 'string' || !it.product) return null;
  if (!it.product.slug && !it.product._id && !it.product.id) return null;
  return {
    key: String(it.key),
    product: it.product,
    variant: it.variant || null,
    size: typeof it.size === 'string' && it.size ? it.size : undefined,
    quantity: sanitizeQty(it.quantity),
  };
}

// Stored shape is {items, saved}; a bare array reads as items (legacy).
function sanitizeStored(raw) {
  const clean = (v) => (Array.isArray(v) ? v.map(sanitizeItem).filter(Boolean) : []);
  if (Array.isArray(raw)) return { items: clean(raw), saved: [] };
  if (raw && typeof raw === 'object') return { items: clean(raw.items), saved: clean(raw.saved) };
  return { items: [], saved: [] };
}

function readStored() {
  try {
    return sanitizeStored(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return { items: [], saved: [] };
  }
}

function persist(items, saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, saved }));
  } catch {
    // QuotaExceeded / private mode — bag stays in memory
  }
}

function readGuest() {
  try {
    return sanitizeStored(JSON.parse(localStorage.getItem(GUEST_KEY))).items;
  } catch {
    return [];
  }
}

function persistGuest(items) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({ items }));
  } catch {
    // private mode — guest bag stays in memory
  }
}

function clearGuest() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    // ignore
  }
}

function readSynced(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(syncedKeyFor(userId)));
    if (!raw) return null;
    const { items, saved } = sanitizeStored(raw);
    return { items, saved };
  } catch {
    return null;
  }
}

function persistSynced(userId, items, saved) {
  try {
    localStorage.setItem(syncedKeyFor(userId), JSON.stringify({ items, saved }));
  } catch {
    // ignore
  }
}

// One-time upgrade from the previous cart storage generation.
function upgradeLegacyStorage() {
  try {
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_MAIN)) {
      localStorage.setItem(STORAGE_KEY, localStorage.getItem(LEGACY_MAIN));
    }
    if (!localStorage.getItem(GUEST_KEY) && localStorage.getItem(LEGACY_GUEST)) {
      localStorage.setItem(GUEST_KEY, localStorage.getItem(LEGACY_GUEST));
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LEGACY_SYNCED_PREFIX)) {
        const nk = k.replace(LEGACY_SYNCED_PREFIX, 'etherstar-bag-synced-');
        if (!localStorage.getItem(nk)) localStorage.setItem(nk, localStorage.getItem(k));
        localStorage.removeItem(k);
      }
    }
    localStorage.removeItem(LEGACY_MAIN);
    localStorage.removeItem(LEGACY_GUEST);
  } catch {
    // private mode — nothing to upgrade
  }
}

// Snapshot-session keys mirror AuthContext so the bag seeds synchronously.
function readSnapshotToken() {
  try {
    return localStorage.getItem('ether-token') || null;
  } catch {
    return null;
  }
}

function readSnapshotUid() {
  try {
    const raw = localStorage.getItem('ether-user');
    const u = raw ? JSON.parse(raw) : null;
    return (u && (u._id || u.id)) || null;
  } catch {
    return null;
  }
}

// Server line shape. Snapshots stay light — checkout re-prices everything.
const toServerLine = (it) => ({
  key: it.key,
  product: it.product._id || it.product.id,
  variant: it.variant
    ? {
      name: it.variant.name,
      material: it.variant.material,
      kt: it.variant.kt,
      price: it.variant.price,
      image: it.variant.image,
    }
    : undefined,
  size: it.size,
  qty: it.quantity,
});

const fromServerLine = (l) =>
  sanitizeItem({
    key: l.key,
    product: l.product,
    variant: l.variant || null,
    size: l.size,
    quantity: l.qty,
  });

// Bag follows the account: logout clears the display, guests persist in
// localStorage (survives reload), members sync to the server. Hydration pulls
// the account bag immediately (token-gated, retried); the display seeds from
// the last-synced snapshot so a logged-in reload never flashes empty. Login
// merges the guest bag with last-write-wins semantics (live display quantity
// overwrites on key conflicts, capped) via a single union + PUT, so retries
// and repeat logins can never multiply quantities. Moves between
// bag/shelf/wishlist are server operations adopted wholesale — never hand-merged.
export const BagProvider = ({ children }) => {
  const { token, user } = useAuth();
  const userId = user?._id || user?.id || null;
  const [initial] = useState(() => {
    upgradeLegacyStorage();
    if (readSnapshotToken()) {
      const snapUid = readSnapshotUid();
      if (snapUid) {
        const snap = readSynced(snapUid);
        if (snap && (snap.items.length > 0 || snap.saved.length > 0)) return snap;
      }
    }
    return readStored();
  });
  const [items, setItems] = useState(initial.items);
  const [saved, setSaved] = useState(initial.saved);
  // True while the account bag is being fetched (mount/refresh/login).
  const [hydrating, setHydrating] = useState(() => Boolean(readSnapshotToken()));
  const mergedForUser = useRef(null);
  const syncingRef = useRef(false);
  const hydratedToken = useRef(null);
  const lastSyncedJson = useRef('');
  const prevTokenRef = useRef(token);
  const prevUserIdRef = useRef(userId);
  // Mirrors of display for post-await reads (user may shop while GET is in flight).
  const itemsRef = useRef(items);
  const savedRef = useRef(saved);
  // Mirror of token for the unload flush below.
  const tokenRef = useRef(token);
  // Set on logout so the save effect skips its post-clear write and preserves
  // the guest buffer (login-merge fuel) instead of wiping it.
  const logoutClearRef = useRef(false);
  // Tracks token for the save effect so the logout-transition render never
  // mirrors account lines into the guest buffer.
  const persistPrevToken = useRef(token);
  // Sequence for write-through PUTs: only the latest push may seal
  // last-synced, so a slow older response can't mark newer lines synced.
  const pushSeqRef = useRef(0);
  // Write-path storm guards (see lib/writeSync): at most one mutating
  // request in flight (queue) + no duplicate concurrent op per key (dedupe).
  // Overlapping fetch-modify-save cycles used to collide into VersionError
  // 500s, and every failure loop retried independently into shared 429s.
  const writeQueueRef = useRef(null);
  if (!writeQueueRef.current) writeQueueRef.current = createWriteQueue();
  const opDedupeRef = useRef(null);
  if (!opDedupeRef.current) opDedupeRef.current = createOpDedupe();
  // Background hydration retries left for the current token (reset on every
  // token change). The GET loop above retries 4x with backoff; when all fail
  // while a snapshot is on display, these same-session retries keep the
  // server truth converging without waiting for the next mount/login.
  const bgRetryCount = useRef(0);
  const bgRetryTimer = useRef(null);
  const [retryTick, setRetryTick] = useState(0);

  // Runs first each commit so later effects see fresh mirrors.
  useEffect(() => {
    itemsRef.current = items;
    savedRef.current = saved;
    tokenRef.current = token;
  });

  const sealSynced = (uid, nextItems, nextSaved) => {
    lastSyncedJson.current = JSON.stringify(nextItems.map(toServerLine));
    if (uid && uid !== 'anon') persistSynced(uid, nextItems, nextSaved);
  };

  // Adopt a full server state wholesale (GET/merge/move responses).
  const adoptServerState = (uid, nextItems, nextSaved) => {
    hydratedToken.current = tokenRef.current;
    sealSynced(uid, nextItems, nextSaved);
    setItems(nextItems);
    setSaved(nextSaved);
    persist(nextItems, nextSaved);
  };

  // Key -> last-acknowledged product id, from the sealed sync payload. Lets
  // send paths re-attach an id to a display line whose product snapshot is
  // slug-only, instead of dropping the line from a whole-bag PUT (which
  // would permanently delete it server-side).
  const acknowledgedIdsByKey = () => {
    try {
      const snap = lastSyncedJson.current && JSON.parse(lastSyncedJson.current);
      if (Array.isArray(snap)) {
        const m = new Map();
        for (const l of snap) {
          if (l && typeof l.key === 'string' && l.product) m.set(l.key, l.product);
        }
        return m;
      }
    } catch {
      // corrupt snapshot — no fallback available
    }
    return new Map();
  };

  // Map display items to sendable server lines. Returns {lines, unmappable}:
  // unmappable counts lines that cannot be sent without deleting them
  // server-side — callers must abort the PUT, never send a shrunken payload.
  const toSendableLines = (displayItems) => {
    const idByKey = acknowledgedIdsByKey();
    const lines = [];
    let unmappable = 0;
    for (const it of displayItems) {
      const l = toServerLine(it);
      if (!l.product) l.product = idByKey.get(String(it.key));
      if (l.product) lines.push(l);
      else unmappable += 1;
    }
    return { lines, unmappable };
  };

  // Logout: flush pre-clear display to the server (local logout doesn't rotate
  // the token, so it still authenticates), then clear display. Flush only when
  // this device hydrated this session — otherwise the server is newer.
  useEffect(() => {
    const prev = prevTokenRef.current;
    const prevUid = prevUserIdRef.current;
    prevTokenRef.current = token;
    prevUserIdRef.current = userId;
    if (!token && prev) {
      if (hydratedToken.current === prev) {
        const snapshot = items;
        const { lines: putLines, unmappable } = toSendableLines(snapshot);
        // Guards: a non-empty display with zero mappable lines must never
        // PUT [] and wipe the server bag. Partially-mappable payloads are
        // aborted too — a shrunken PUT would permanently delete the omitted
        // lines server-side; keeping the last-synced server state is safer.
        if (unmappable > 0 && typeof console !== 'undefined') {
          console.warn(`bag: logout flush aborted — ${unmappable} line(s) lost their product id; keeping server state`);
        }
        if (unmappable === 0 && (snapshot.length === 0 || putLines.length > 0)) {
          const body = JSON.stringify(putLines);
          // Queued behind any in-flight write so the flush can't collide with
          // it into a VersionError; single attempt (best effort — the next
          // login GET is the backstop).
          writeQueueRef.current(() =>
            fetch(apiUrl('/api/bag'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prev}` },
              body,
            })
          )
          .then(async (res) => {
              if (!res.ok || !prevUid) return;
              const data = await res.json().catch(() => ({}));
              if (!data || data.droppedAll) return;
              persistSynced(prevUid, snapshot, savedRef.current || []);
            })
            .catch(() => {
              // offline — server keeps last synced state; next login GET decides
            });
        }
      }
      logoutClearRef.current = true;
      mergedForUser.current = null;
      hydratedToken.current = null;
      lastSyncedJson.current = '';
      pushSeqRef.current += 1; // invalidate any in-flight push
      // Wipe stale guest fuel: anything the guest buffer holds predates this
      // session's login (it was merged then, or never logged in with) — kept
      // fuel would re-merge on every future login and multiply quantities.
      // Post-logout guest shopping re-populates it fresh. The per-user
      // acknowledged snapshot is intentionally kept (instant paint on next
      // login + dedupe basis for the merge).
      clearGuest();
      bgRetryCount.current = 0;
      if (bgRetryTimer.current) {
        clearTimeout(bgRetryTimer.current);
        bgRetryTimer.current = null;
      }
      setHydrating(false);
      setItems([]);
      setSaved([]);
      persist([], []);
    } else if (!token) {
      mergedForUser.current = null;
      hydratedToken.current = null;
      setHydrating(false);
    } else if (token !== prev) {
      // Fresh login: paint the last-synced snapshot immediately (same-session
      // logins skip the mount seed below, so without this the display sits
      // empty until the GET resolves — or forever if the GET keeps failing).
      // Hydration revalidates against the server right after.
      bgRetryCount.current = 0;
      const snapUid = userId || readSnapshotUid();
      if (snapUid && snapUid !== 'anon' && items.length === 0 && saved.length === 0) {
        const snap = readSynced(snapUid);
        if (snap && (snap.items.length > 0 || snap.saved.length > 0)) {
          setItems(snap.items);
          setSaved(snap.saved);
          persist(snap.items, snap.saved);
        }
      }
      setHydrating(true);
    }
  }, [token, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydration (fetch on mount): whenever a token is present — fresh login or
  // page refresh — pull the account bag immediately. Token-gated (NOT
  // user-gated) so a slow /me can never leave a logged-in reload empty.
  // Retries transient failures with backoff; 401/403 is terminal (AuthContext
  // owns the logout). Cached snapshot stays on display throughout.
  useEffect(() => {
    if (!token) return;
    const uid = userId || readSnapshotUid() || 'anon';
    if (mergedForUser.current === uid && hydratedToken.current === token) return;
    mergedForUser.current = uid;
    const baseQty = new Map(items.map((it) => [it.key, it.quantity]));
    let cancelled = false;
    syncingRef.current = true;
    setHydrating(true);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      let bagData = null;
      let terminalAuth = false;
      for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
        if (attempt > 0) await sleep(800 * attempt);
        if (cancelled) return;
        try {
          const getRes = await fetch(apiUrl('/api/bag'), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (getRes.status === 401 || getRes.status === 403) {
            terminalAuth = true;
            break;
          }
          const data = await getRes.json().catch(() => ({}));
          if (!getRes.ok || !Array.isArray(data.items)) throw new Error('bag fetch failed');
          bagData = data;
          break;
        } catch {
          // transient (offline, 429, 5xx, blip) — back off and retry; after
          // the last attempt bagData stays null and the branch below keeps
          // the cached snapshot (never wipes) for a next-mount retry.
        }
      }
      if (cancelled) return;
      if (terminalAuth || !bagData) {
        // Dead token: AuthContext clears the session via /me. Persistent
        // network failure: the snapshot stays on display (painted at login
        // above) and a few same-session background retries keep converging
        // without waiting for the next mount.
        mergedForUser.current = null;
        syncingRef.current = false;
        setHydrating(false);
        if (!terminalAuth && !cancelled && bgRetryCount.current < 3) {
          bgRetryCount.current += 1;
          bgRetryTimer.current = setTimeout(() => {
            bgRetryTimer.current = null;
            if (cancelled || tokenRef.current !== token || hydratedToken.current === token) return;
            setRetryTick((n) => n + 1);
          }, 5000);
        }
        return;
      }
      try {
        if (!lastSyncedJson.current && uid !== 'anon') {
          const persisted = readSynced(uid);
          if (persisted) {
            lastSyncedJson.current = JSON.stringify(persisted.items.map(toServerLine));
          }
        }
        const serverItems = bagData.items.map(fromServerLine).filter(Boolean);
        const serverSaved = Array.isArray(bagData.saved)
          ? bagData.saved.map(fromServerLine).filter(Boolean)
          : [];
        const guestItems = readGuest();
        // Keys the server has acknowledged (last agreement). Display lines
        // outside this set were never stored — fold them into the merge pool
        // so an unsynced add can't be wiped by the GET above. Removal-aware:
        // base keys dropped from the live display stay dropped.
        let syncedKeys = new Set();
        try {
          const snap = lastSyncedJson.current && JSON.parse(lastSyncedJson.current);
          if (Array.isArray(snap)) syncedKeys = new Set(snap.map((l) => l && l.key));
        } catch {
          // corrupt snapshot — treat everything as unsynced (safe direction)
        }
        const live = itemsRef.current || [];
        // Never-acknowledged lines only: a line the server already sealed
        // (in syncedKeys) must NEVER re-enter the pool — not via an empty or
        // stale base (login snapshot paint), nor via an in-flight qty edit.
        // Re-pooling acked lines is what used to SUM them onto the server
        // copy every login (1 -> 2 -> 4 doubling).
        const extra = live.filter(
          (it) => !syncedKeys.has(it.key) && baseQty.get(it.key) !== it.quantity
        );
        let localPool = guestItems;
        if (extra.length > 0) {
          const byKey = new Map(guestItems.map((g) => [g.key, g]));
          for (const l of extra) byKey.set(l.key, l); // newest display wins
          localPool = [...byKey.values()];
        }
        const liveKeys = new Set(live.map((it) => it.key));
        localPool = localPool.filter((l) => !baseQty.has(l.key) || liveKeys.has(l.key));
        // Removals made while GET was in flight must stick: drop those keys
        // from the server side too, or a remove-then-reload resurrects them.
        const removedKeys = new Set([...baseQty.keys()].filter((k) => !liveKeys.has(k)));
        let serverKept = serverItems;
        if (removedKeys.size > 0) {
          serverKept = serverItems.filter((it) => !removedKeys.has(it.key));
        }
        // Heal: server came back empty while this device holds previously
        // acknowledged lines (a save missed the server before reload).
        // Re-offer those lines instead of adopting [].
        if (serverKept.length === 0 && localPool.length === 0 && removedKeys.size === 0) {
          const liveNow = itemsRef.current || [];
          if (liveNow.length > 0 && lastSyncedJson.current) {
            try {
              const snap = JSON.parse(lastSyncedJson.current);
              if (Array.isArray(snap) && snap.length > 0) {
                const acked = new Set(snap.map((l) => l && l.key));
                const reoffer = liveNow.filter((l) => acked.has(l.key));
                if (reoffer.length > 0) localPool = reoffer;
              }
            } catch {
              // corrupt snapshot — fall through to server truth
            }
          }
        }

        let finalItems = serverKept;
        let finalSaved = serverSaved;
        let needsPut = localPool.length > 0 || removedKeys.size > 0;
        if (needsPut) {
          // Union locally with last-write-wins semantics (NOT SUM): on a key
          // conflict the live display quantity overwrites the server copy, so
          // re-running the merge can never multiply quantities (idempotent —
          // 1 item stays 1 across unlimited logouts/logins). The PUT below is
          // then a plain replace of an already-converged union.
          const byKey = new Map(serverKept.map((it) => [it.key, { ...it }]));
          for (const g of localPool) {
            if (byKey.has(g.key)) {
              const cur = byKey.get(g.key);
              byKey.set(g.key, { ...cur, quantity: sanitizeQty(g.quantity) });
            } else if (byKey.size < 20) {
              byKey.set(g.key, { ...g });
            }
          }
          for (const k of removedKeys) byKey.delete(k);
          finalItems = [...byKey.values()];
          // Superset invariant: the union must never drop a server-held line
          // except via explicit user removal — otherwise a merge PUT would
          // permanently delete it. Abort loudly instead of sending shrunk.
          const finalKeys = new Set(finalItems.map((it) => it.key));
          const lostServerKeys = serverKept
            .map((it) => it.key)
            .filter((k) => !removedKeys.has(k) && !finalKeys.has(k));
          if (lostServerKeys.length > 0) {
            if (typeof console !== 'undefined') {
              console.warn(`bag: merge aborted — would drop ${lostServerKeys.length} server line(s); keeping server state`);
            }
            if (!cancelled) adoptServerState(uid, serverKept, finalSaved);
            return;
          }
          const { lines: putLines, unmappable } = toSendableLines(finalItems);
          // Guards: non-empty unions with zero mappable lines must never
          // PUT [] and wipe a healthy server bag; partially-mappable unions
          // keep their local display (sealed below) instead of shrinking.
          if (finalItems.length > 0 && (putLines.length === 0 || unmappable > 0)) {
            if (unmappable > 0 && typeof console !== 'undefined') {
              console.warn(`bag: merge PUT aborted — ${unmappable} line(s) lost their product id; keeping local copy`);
            }
            if (!cancelled) adoptServerState(uid, finalItems, finalSaved);
            return;
          }
          const putBody = JSON.stringify(putLines);
          // Serialized with other writes + retried on 409/429/5xx, so a
          // colliding writer backs off instead of 500ing into a storm.
          const putRes = await writeQueueRef.current(() =>
            fetchWrite(apiUrl('/api/bag'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: putBody,
            })
          );
          const putData = await putRes.json().catch(() => ({}));
          if (!putRes.ok || !Array.isArray(putData.items)) throw new Error('bag sync failed');
          if (putData.droppedAll) {
            // Server refused every line (stale/dead products): keep the local
            // union on display instead of wiping; checkout revalidates anyway.
            lastSyncedJson.current = putBody;
            mergedForUser.current = null;
          } else {
            if (putData.dropped > 0 && typeof console !== 'undefined') {
              console.warn(`bag: server dropped ${putData.dropped} unavailable line(s)`);
            }
            finalItems = putData.items.map(fromServerLine).filter(Boolean);
            finalSaved = Array.isArray(putData.saved)
              ? putData.saved.map(fromServerLine).filter(Boolean)
              : serverSaved;
          }
          clearGuest();
        }

        if (!cancelled) {
          if (bagData.removedFromBag > 0 && typeof console !== 'undefined') {
            console.warn(`bag: server removed ${bagData.removedFromBag} unavailable line(s)`);
          }
          adoptServerState(uid, finalItems, finalSaved);
        }
      } catch {
        if (!cancelled) mergedForUser.current = null; // retry on next mount/token change
      } finally {
        if (!cancelled) {
          syncingRef.current = false;
          setHydrating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (bgRetryTimer.current) {
        clearTimeout(bgRetryTimer.current);
        bgRetryTimer.current = null;
      }
    };
  }, [token, userId, retryTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist display always (guest survives reload via mirrored guest buffer
  // while logged out). Logged in: write-through sync — every add/remove/
  // update fires an immediate PUT (leading edge) so the DB is always ready
  // for the next reload, plus a trailing debounced PUT that coalesces rapid
  // bursts (qty stepper) and heals failed immediates.
  useEffect(() => {
    persist(items, saved);
    if (!token) {
      const transitioned = Boolean(persistPrevToken.current);
      persistPrevToken.current = token;
      if (transitioned) return; // logout commit: logout effect owns storage here
      if (logoutClearRef.current) {
        logoutClearRef.current = false;
        if (items.length === 0 && saved.length === 0) return; // post-logout clear: keep guest buffer
      }
      persistGuest(items);
      return;
    }
    persistPrevToken.current = token;
    if (!userId || syncingRef.current || hydratedToken.current !== token) return;
    const { lines: putLines, unmappable } = toSendableLines(items);
    // Guards: non-empty displays with zero mappable lines must never PUT [];
    // partially-mappable displays skip this round (server keeps last-synced)
    // instead of shrinking — a later change or merge re-offers the lines.
    if (items.length > 0 && putLines.length === 0) return;
    if (unmappable > 0) {
      if (typeof console !== 'undefined') {
        console.warn(`bag: sync skipped — ${unmappable} line(s) lost their product id; keeping server state`);
      }
      return;
    }
    const body = JSON.stringify(putLines);
    if (body === lastSyncedJson.current) return;
    const snapshot = items;
    const snapshotSaved = saved;
    const snapshotUid = userId;
    const snapshotToken = token;
    // Serialized + retried: at most one bag write in flight, and 409/429/5xx
    // back off with Retry-After honored instead of fanning out into a storm.
    const pushBody = async (payload, seq) => {
      await writeQueueRef.current(async () => {
        if (payload === lastSyncedJson.current) return; // sealed while queued
        let res;
        try {
          res = await fetchWrite(apiUrl('/api/bag'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${snapshotToken}` },
            body: payload,
          });
        } catch {
          return; // offline throughout retries — next change retries; local intact
        }
        if (!res.ok) return; // exhausted retries — next change retries
        const data = await res.json().catch(() => ({}));
        if (data && data.droppedAll) {
          if (typeof console !== 'undefined') {
            console.warn('bag: server refused all lines (unavailable products); keeping local copy');
          }
          return; // leave last-synced untouched so the lines are re-offered
        }
        if (data && data.dropped > 0 && typeof console !== 'undefined') {
          console.warn(`bag: server dropped ${data.dropped} unavailable line(s)`);
        }
        if (seq === pushSeqRef.current) {
          lastSyncedJson.current = payload;
          persistSynced(snapshotUid, snapshot, snapshotSaved);
        }
      });
    };
    // Leading edge: immediate write-through on every bag action.
    const seq = ++pushSeqRef.current;
    pushBody(body, seq);
    // Trailing edge: coalesces bursts and heals a failed immediate. Aborts
    // when the display moved on since scheduling (adopt/merge/undo) — a stale
    // payload must never clobber newer server state — or while a hydration
    // merge owns the server conversation.
    const scheduledQty = JSON.stringify(items.map((it) => [it.key, it.quantity]));
    const t = setTimeout(() => {
      if (syncingRef.current) return;
      const currentQty = JSON.stringify((itemsRef.current || []).map((it) => [it.key, it.quantity]));
      if (currentQty !== scheduledQty) return; // display moved on; stale payload
      if (body === lastSyncedJson.current) return;
      pushBody(body, ++pushSeqRef.current);
    }, 800);
    return () => clearTimeout(t);
  }, [items, saved, token, userId]);

  // Refresh/close with a save still inside the 800ms debounce: flush the
  // latest display now. Same-origin only (Vite proxy / single-domain prod),
  // so keepalive carries the auth header with no preflight involved.
  useEffect(() => {
    const onUnload = () => {
      const t = tokenRef.current;
      const lines = itemsRef.current || [];
      if (!t) return;
      if (hydratedToken.current !== t) return; // never synced here; server is newer
      const { lines: putLines, unmappable } = toSendableLines(lines);
      if (lines.length > 0 && putLines.length === 0) return; // never wipe with []
      if (unmappable > 0) return; // never shrink: keep last-synced server state
      const body = JSON.stringify(putLines);
      if (body === lastSyncedJson.current) return; // nothing new since last agreement
      if (lines.length === 0 && !lastSyncedJson.current) return; // empty throughout
      try {
        fetch(apiUrl('/api/bag'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body,
          keepalive: true,
        });
      } catch {
        // unload path — best effort only
      }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, []);

  // Cross-tab sync: server is truth when logged in (ignore local echo to
  // avoid stale PUT clobber); guests converge via storage while logged out.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (token) return;
      try {
        const next = sanitizeStored(JSON.parse(e.newValue));
        setItems(next.items);
        setSaved(next.saved);
      } catch {
        // ignore corrupt payloads from other tabs
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [token]);

  const cartTotal = (list) => list.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  // Whole-bag cap: returns false (and changes nothing) when the change
  // would push the bag over MAX_CART_QTY — callers redirect to Contact.
  const addItem = (product, variant, quantity = 1, size) => {
    const qty = sanitizeQty(quantity);
    const resolvedVariant = variant || product.variants?.[0] || null;
    const cleanSize = typeof size === 'string' && size ? size : undefined;
    const key = buildKey(product, resolvedVariant, cleanSize);
    const existing = items.find((item) => item.key === key);
    const nextQty = existing ? sanitizeQty(existing.quantity + qty) : qty;
    const nextTotal = cartTotal(items) - (existing ? existing.quantity : 0) + nextQty;
    if (nextTotal > MAX_CART_QTY) return false;
    setItems((prev) => {
      const prevExisting = prev.find((item) => item.key === key);
      if (prevExisting) {
        return prev.map((item) =>
          item.key === key
            ? { ...item, quantity: sanitizeQty(item.quantity + qty) }
            : item
        );
      }
      // Snapshot the product as passed (always fresh from the live PDP)
      return [
        ...prev,
        { key, product, variant: resolvedVariant, size: cleanSize, quantity: qty },
      ];
    });
    return true;
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const updateQuantity = (key, quantity) => {
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      removeItem(key);
      return true;
    }
    const item = items.find((it) => it.key === key);
    if (!item) return false;
    const nextQty = sanitizeQty(qty);
    if (cartTotal(items) - item.quantity + nextQty > MAX_CART_QTY) return false;
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, quantity: sanitizeQty(qty) } : it))
    );
    return true;
  };

  const clearBag = () => {
    clearGuest();
    setItems([]);
  };

  // Remove one shelf (saved-for-later) line outright.
  const removeSaved = (key) => opDedupeRef.current(`saved:${key}`, async () => {
    const opToken = tokenRef.current;
    if (!opToken) {
      setSaved((prev) => prev.filter((l) => l.key !== key));
      return true;
    }
    const prevSaved = savedRef.current || [];
    setSaved((prev) => prev.filter((l) => l.key !== key));
    try {
      const data = await callBagOp('/api/bag/saved', { key }, { method: 'DELETE' });
      if (tokenRef.current !== opToken) return true; // logged out mid-flight
      adoptBagState(
        (data.items || []).map(fromServerLine).filter(Boolean),
        (data.saved || []).map(fromServerLine).filter(Boolean)
      );
      return true;
    } catch {
      if (tokenRef.current !== opToken) return false; // logout owns display now
      setSaved(prevSaved); // revert
      return false;
    }
  });

  // Adopt a server bag state wholesale (used after move/shelf operations and
  // by WishlistContext after favourite -> bag moves).
  const adoptBagState = (nextItems, nextSaved) => {
    const cleanItems = (nextItems || []).map(sanitizeItem).filter(Boolean);
    const cleanSaved = (nextSaved || []).map(sanitizeItem).filter(Boolean);
    hydratedToken.current = tokenRef.current;
    lastSyncedJson.current = JSON.stringify(cleanItems.map(toServerLine));
    if (userId) persistSynced(userId, cleanItems, cleanSaved);
    setItems(cleanItems);
    setSaved(cleanSaved);
    persist(cleanItems, cleanSaved);
  };

  // Mutating bag op: serialized behind other writes + retried with backoff
  // on 409/429/5xx (honoring Retry-After). Throws on final failure so
  // callers run their revert/verify paths.
  const callBagOp = async (path, body, options) => {
    const opToken = tokenRef.current;
    const res = await writeQueueRef.current(() =>
      fetchWrite(
        apiUrl(path),
        {
          method: (options && options.method) || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(opToken ? { Authorization: `Bearer ${opToken}` } : {}),
          },
          body: JSON.stringify(body || {}),
        },
        { attempts: (options && options.attempts) || 3 }
      )
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Bag update failed');
      err.code = res.status;
      throw err;
    }
    return data;
  };

  // Shelf (saved-for-later) moves. Guests: shelf is local-only. Logged in:
  // server op, adopted wholesale (never hand-merged).
  const saveForLater = (key) => opDedupeRef.current(`shelf:${key}`, async () => {
    const opToken = tokenRef.current;
    const move = (list, setList) => {
      const it = list.find((l) => l.key === key);
      if (!it) return null;
      setList((prev) => prev.filter((l) => l.key !== key));
      return it;
    };
    if (!opToken) {
      const it = move(items, setItems);
      if (it && !saved.some((l) => l.key === key)) setSaved((prev) => [...prev, it]);
      return true;
    }
    const prevItems = itemsRef.current || [];
    const prevSaved = savedRef.current || [];
    const it = prevItems.find((l) => l.key === key) || prevSaved.find((l) => l.key === key);
    setItems((prev) => prev.filter((l) => l.key !== key));
    if (it && !prevSaved.some((l) => l.key === key)) setSaved((prev) => [...prev, it]);
    try {
      const data = await callBagOp('/api/bag/save-for-later', { key });
      if (tokenRef.current !== opToken) return true; // logged out mid-flight
      adoptBagState(
        (data.items || []).map(fromServerLine).filter(Boolean),
        (data.saved || []).map(fromServerLine).filter(Boolean)
      );
      return true;
    } catch {
      if (tokenRef.current !== opToken) return false; // logout owns display now
      setItems(prevItems); // revert optimistic move
      setSaved(prevSaved);
      return false;
    }
  });

  const moveToBag = (key) => opDedupeRef.current(`bag:${key}`, async () => {
    const opToken = tokenRef.current;
    if (!opToken) {
      const it = saved.find((l) => l.key === key);
      if (!it) return false;
      const existing = items.find((l) => l.key === key);
      const nextQty = sanitizeQty((existing?.quantity || 0) + it.quantity);
      if (cartTotal(items) - (existing?.quantity || 0) + nextQty > MAX_CART_QTY) return false;
      setSaved((prev) => prev.filter((l) => l.key !== key));
      if (existing) {
        setItems((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: nextQty } : l)));
      } else {
        setItems((prev) => [...prev, it]);
      }
      return true;
    }
    const prevItems = itemsRef.current || [];
    const prevSaved = savedRef.current || [];
    try {
      const data = await callBagOp('/api/bag/move-to-bag', { key });
      if (tokenRef.current !== opToken) return true; // logged out mid-flight
      adoptBagState(
        (data.items || []).map(fromServerLine).filter(Boolean),
        (data.saved || []).map(fromServerLine).filter(Boolean)
      );
      return true;
    } catch {
      if (tokenRef.current !== opToken) return false; // logout owns display now
      setItems(prevItems);
      setSaved(prevSaved);
      return false;
    }
  });

  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal =
    Math.round(
      items.reduce((sum, item) => {
        const unit = Number(item.variant?.price ?? item.product.price) || 0;
        return sum + unit * (Number(item.quantity) || 0);
      }, 0) * 100
    ) / 100;

  // True for pre-existing bags already over the cap (e.g. stored before the
  // limit shipped) — UI gates checkout to Contact instead of rewriting data.
  const limitExceeded = totalItems > MAX_CART_QTY;

  return (
    <BagContext.Provider
      value={{
        items,
        saved,
        hydrating,
        addItem,
        removeItem,
        updateQuantity,
        clearBag,
        removeSaved,
        saveForLater,
        moveToBag,
        adoptBagState,
        totalItems,
        subtotal,
        savedCount: saved.length,
        limitExceeded,
        maxCartQty: MAX_CART_QTY,
        maxLineQty: MAX_LINE_QTY,
      }}
    >
      {children}
    </BagContext.Provider>
  );
};
