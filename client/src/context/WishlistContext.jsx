import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../config';
import { createWriteQueue, createOpDedupe, fetchWrite } from '../lib/writeSync';
import { useAuth } from './AuthContext';
import { useBag } from './BagContext';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'etherstar-wishlist';
const GUEST_KEY = 'etherstar-wishlist-guest';
const LEGACY_GUEST_KEY = 'ether-wishlist';
const syncedKeyFor = (userId) => `etherstar-wishlist-synced-${userId || 'anon'}`;

// Wishlist cap — mirrors server MAX_FAVS (lib/bagLines).
export const MAX_FAVS = 100;

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
};

const readGuestPairs = () => {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((p) => p && p.id) : [];
  } catch {
    return [];
  }
};

// One-time upgrade from the previous favourites storage generation.
function upgradeLegacyStorage() {
  try {
    if (!localStorage.getItem(GUEST_KEY) && localStorage.getItem(LEGACY_GUEST_KEY)) {
      localStorage.setItem(GUEST_KEY, localStorage.getItem(LEGACY_GUEST_KEY));
    }
    localStorage.removeItem(LEGACY_GUEST_KEY);
  } catch {
    // private mode — nothing to upgrade
  }
}

const entryId = (e) => String((e && e.product && (e.product._id || e.product.id)) || '');

function sanitizeEntry(e) {
  if (!e || !e.product) return null;
  const id = entryId(e);
  if (!id) return null;
  return { product: e.product, addedAt: e.addedAt || new Date().toISOString() };
}

function sanitizeEntries(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.items) ? raw.items : [];
  return list.map(sanitizeEntry).filter(Boolean).slice(0, MAX_FAVS);
}

function readStored() {
  try {
    return sanitizeEntries(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return [];
  }
}

function persistEntries(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // private mode — memory only
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
    return sanitizeEntries(raw);
  } catch {
    return null;
  }
}

function persistSynced(userId, items) {
  try {
    if (userId && userId !== 'anon') {
      localStorage.setItem(syncedKeyFor(userId), JSON.stringify({ items }));
    }
  } catch {
    // ignore
  }
}

// Snapshot-session keys mirror AuthContext so the wishlist seeds synchronously.
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

const idsOf = (entries) => entries.map(entryId).filter(Boolean);
const syncBodyOf = (entries) => JSON.stringify({ ids: idsOf(entries) });

// Favourites for everyone: guests persist in localStorage, logged-in users
// sync to the Wishlist collection. Display seeds from the last-synced
// snapshot so a logged-in reload never flashes empty. Hydration pulls the
// account list immediately (token-gated, retried); login merges the guest
// list with union semantics (no duplicates) via a single merge + PUT, so
// retries can never duplicate. Every add/remove updates the display
// immediately and fires a leading PUT plus a trailing debounced PUT (800ms),
// mirroring BagContext, so rapid hearts never hit rate limits.
export const WishlistProvider = ({ children }) => {
  const { token, user, logout } = useAuth();
  const { adoptBagState } = useBag();
  const userId = user?._id || user?.id || null;
  const [initial] = useState(() => {
    upgradeLegacyStorage();
    if (readSnapshotToken()) {
      const snapUid = readSnapshotUid();
      if (snapUid) {
        const snap = readSynced(snapUid);
        if (snap && snap.length > 0) return snap;
      }
    }
    return readStored();
  });
  const [items, setItems] = useState(initial);
  const [guestPairs, setGuestPairs] = useState(() => readGuestPairs());
  // True while the account wishlist is being fetched (mount/refresh/login).
  const [hydrating, setHydrating] = useState(() => Boolean(readSnapshotToken()));
  const hydratedFor = useRef(null);
  const mergedForUser = useRef(null);
  const syncingRef = useRef(false);
  const hydratedToken = useRef(null);
  const lastSyncedJson = useRef('');
  const prevTokenRef = useRef(token);
  const prevUserIdRef = useRef(userId);
  // Mirrors of display for post-await reads (user may heart while GET is in flight).
  const itemsRef = useRef(items);
  // Mirror of token for the unload flush below.
  const tokenRef = useRef(token);
  const userIdRef = useRef(userId);
  // Set on logout so the save effect skips its post-clear write.
  const logoutClearRef = useRef(false);
  // Tracks token for the save effect so the logout-transition render never
  // mirrors account entries into the guest buffer.
  const persistPrevToken = useRef(token);
  // Sequence for write-through PUTs: only the latest push may seal
  // last-synced, so a slow older response can't mark newer hearts synced.
  const pushSeqRef = useRef(0);
  // Write-path storm guards (see lib/writeSync): at most one mutating
  // request in flight (queue) + no duplicate concurrent op per key (dedupe).
  const writeQueueRef = useRef(null);
  if (!writeQueueRef.current) writeQueueRef.current = createWriteQueue();
  const opDedupeRef = useRef(null);
  if (!opDedupeRef.current) opDedupeRef.current = createOpDedupe();

  // Runs first each commit so later effects see fresh mirrors.
  useEffect(() => {
    itemsRef.current = items;
    tokenRef.current = token;
    userIdRef.current = userId;
  });

  const persistGuests = useCallback((pairs) => {
    setGuestPairs(pairs);
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(pairs));
    } catch {
      // private mode — memory only
    }
  }, []);

  const sealSynced = useCallback((uid, nextItems) => {
    lastSyncedJson.current = syncBodyOf(nextItems);
    if (uid && uid !== 'anon') persistSynced(uid, nextItems);
  }, []);

  // Adopt a full server state wholesale (GET/merge/PUT/move responses).
  const adoptServerState = useCallback((uid, nextItems) => {
    const clean = sanitizeEntries(nextItems);
    hydratedToken.current = tokenRef.current;
    sealSynced(uid, clean);
    setItems(clean);
    persistEntries(clean);
  }, [sealSynced]);

  const refresh = useCallback(async () => {
    const t = tokenRef.current || token;
    if (!t) return false;
    try {
      const res = await fetch(apiUrl('/api/wishlist'), {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.items)) return false;
      // Stale-session guard: a logout mid-flight must not paint or seal —
      // the logout path owns the display from here.
      if (tokenRef.current !== t) return false;
      const clean = sanitizeEntries(data.items);
      if (data.removed > 0 && typeof console !== 'undefined') {
        console.warn(`wishlist: server removed ${data.removed} unavailable favourite(s)`);
      }
      const uid = userIdRef.current || readSnapshotUid() || 'anon';
      hydratedToken.current = t;
      sealSynced(uid, clean);
      setItems(clean);
      persistEntries(clean);
      return true;
    } catch {
      return false;
    }
  }, [token, sealSynced]);

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
        const snapshot = itemsRef.current || [];
        const ids = idsOf(snapshot);
        // Guard: non-empty display with zero mappable ids must never
        // PUT [] and wipe the server list — just clear locally instead.
        if (snapshot.length === 0 || ids.length > 0) {
          const body = JSON.stringify({ ids });
          // Queued behind any in-flight write so the flush can't collide
          // with it; single attempt (best effort — next login GET backstops).
          writeQueueRef.current(() =>
            fetch(apiUrl('/api/wishlist'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prev}` },
              body,
            })
          )
            .then(async (res) => {
              if (!res.ok || !prevUid) return;
              const data = await res.json().catch(() => ({}));
              if (!data || data.droppedAll) return;
              persistSynced(prevUid, snapshot);
            })
            .catch(() => {
              // offline — server keeps last synced state; next login GET decides
            });
        }
      }
      logoutClearRef.current = true;
      mergedForUser.current = null;
      hydratedFor.current = null;
      hydratedToken.current = null;
      lastSyncedJson.current = '';
      pushSeqRef.current += 1; // invalidate any in-flight push
      setHydrating(false);
      setItems([]);
      persistEntries([]);
    } else if (!token) {
      mergedForUser.current = null;
      hydratedFor.current = null;
      hydratedToken.current = null;
      setHydrating(false);
    } else if (token !== prev) {
      // Fresh login: rehydrate against the account list.
      setHydrating(true);
    }
  }, [token, userId]);

  // Hydration (fetch on mount): whenever a token is present — fresh login or
  // page refresh — pull the account wishlist immediately. Token-gated (NOT
  // user-gated) so a slow /me can never leave a logged-in reload empty.
  // Retries transient failures with backoff; 401/403 is terminal (AuthContext
  // owns the logout). Cached snapshot stays on display throughout.
  useEffect(() => {
    if (!token) return;
    const uid = userId || readSnapshotUid() || 'anon';
    if (mergedForUser.current === uid && hydratedToken.current === token) return;
    mergedForUser.current = uid;
    hydratedFor.current = null;
    const baseIds = new Set(idsOf(itemsRef.current || []));
    let cancelled = false;
    syncingRef.current = true;
    setHydrating(true);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      let listData = null;
      let terminalAuth = false;
      for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
        if (attempt > 0) await sleep(800 * attempt);
        if (cancelled) return;
        try {
          const getRes = await fetch(apiUrl('/api/wishlist'), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (getRes.status === 401 || getRes.status === 403) {
            terminalAuth = true;
            break;
          }
          const data = await getRes.json().catch(() => ({}));
          if (!getRes.ok || !Array.isArray(data.items)) throw new Error('wishlist fetch failed');
          listData = data;
          break;
        } catch {
          // transient (offline, 429, 5xx, blip) — back off and retry; after
          // the last attempt listData stays null and the branch below keeps
          // the cached snapshot (never wipes) for a next-mount retry.
        }
      }
      if (cancelled) return;
      if (terminalAuth || !listData) {
        // Dead token: AuthContext clears the session via /me; persistent
        // network failure: snapshot stays, next mount retries.
        mergedForUser.current = null;
        syncingRef.current = false;
        setHydrating(false);
        return;
      }
      try {
        if (!lastSyncedJson.current && uid !== 'anon') {
          const persisted = readSynced(uid);
          if (persisted) lastSyncedJson.current = syncBodyOf(persisted);
        }
        const serverEntries = sanitizeEntries(listData.items);
        const pairs = readGuestPairs();
        const guestIds = pairs.map((p) => String(p.id)).filter(Boolean);
        // Keys the server has acknowledged (last agreement). Display entries
        // outside this set were never stored — fold them into the merge pool
        // so an unsynced heart can't be wiped by the GET above. Removal-aware:
        // base ids dropped from the live display stay dropped.
        let syncedKeys = new Set();
        try {
          const snap = lastSyncedJson.current && JSON.parse(lastSyncedJson.current);
          if (snap && Array.isArray(snap.ids)) syncedKeys = new Set(snap.ids.map(String));
        } catch {
          // corrupt snapshot — treat everything as unsynced (safe direction)
        }
        const live = itemsRef.current || [];
        const liveIds = new Set(idsOf(live));
        const extraIds = idsOf(live).filter((id) => !baseIds.has(id) || !syncedKeys.has(id));
        // Merge pool: guest ids + in-flight extras, minus hearts removed live.
        const pool = [...guestIds, ...extraIds].filter((id) => !baseIds.has(id) || liveIds.has(id));
        const localPool = [...new Set(pool.map(String))].filter(Boolean);
        // Removals made while GET was in flight must stick: drop those ids
        // from the server side too, or an un-heart-then-reload resurrects them.
        const removedKeys = new Set([...baseIds].filter((id) => !liveIds.has(id)));
        let serverKept = serverEntries;
        if (removedKeys.size > 0) {
          serverKept = serverEntries.filter((e) => !removedKeys.has(entryId(e)));
        }
        // Heal: server came back empty while this device holds previously
        // acknowledged entries (a save missed the server before reload).
        // Re-offer those entries instead of adopting [].
        if (serverKept.length === 0 && localPool.length === 0 && removedKeys.size === 0) {
          const liveNow = itemsRef.current || [];
          if (liveNow.length > 0 && lastSyncedJson.current) {
            try {
              const snap = JSON.parse(lastSyncedJson.current);
              if (snap && Array.isArray(snap.ids) && snap.ids.length > 0) {
                const acked = new Set(snap.ids.map(String));
                const reoffer = idsOf(liveNow).filter((id) => acked.has(id));
                if (reoffer.length > 0) localPool.push(...reoffer.filter((id) => !localPool.includes(id)));
              }
            } catch {
              // corrupt snapshot — fall through to server truth
            }
          }
        }

        let finalEntries = serverKept;
        const needsPut = localPool.length > 0 || removedKeys.size > 0;
        if (needsPut) {
          // Union locally (no duplicates, capped) so the PUT below is a plain
          // replace — one round trip, no duplicate risk on retry.
          const byId = new Map(serverKept.map((e) => [entryId(e), e]));
          // Product snapshots for local-only ids: prefer live display, fall
          // back to guest slug stubs (server re-populates on PUT response).
          const productById = new Map();
          for (const e of live) {
            const id = entryId(e);
            if (id && e.product) productById.set(id, e.product);
          }
          for (const p of pairs) {
            if (p && p.id && !productById.has(String(p.id))) {
              productById.set(String(p.id), { _id: String(p.id), slug: p.slug || '' });
            }
          }
          const now = new Date().toISOString();
          for (const id of localPool) {
            if (!byId.has(id) && byId.size < MAX_FAVS) {
              const product = productById.get(id) || { _id: id };
              byId.set(id, { product, addedAt: now });
            }
          }
          for (const id of removedKeys) byId.delete(id);
          finalEntries = [...byId.values()].slice(0, MAX_FAVS);
          const putIds = idsOf(finalEntries);
          // Guard: non-empty display with zero mappable ids must never
          // PUT [] and wipe a healthy server list.
          if (finalEntries.length > 0 && putIds.length === 0) {
            if (!cancelled) adoptServerState(uid, finalEntries);
            return;
          }
          const putBody = JSON.stringify({ ids: putIds });
          // Serialized with other writes + retried on 409/429/5xx.
          const putRes = await writeQueueRef.current(() =>
            fetchWrite(apiUrl('/api/wishlist'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: putBody,
            })
          );
          const putData = await putRes.json().catch(() => ({}));
          if (!putRes.ok || !Array.isArray(putData.items)) throw new Error('wishlist sync failed');
          if (putData.droppedAll) {
            // Server refused every id (stale/dead products): keep the local
            // union on display instead of wiping.
            lastSyncedJson.current = putBody;
            mergedForUser.current = null;
          } else {
            if (putData.dropped > 0 && typeof console !== 'undefined') {
              console.warn(`wishlist: server dropped ${putData.dropped} unavailable favourite(s)`);
            }
            finalEntries = sanitizeEntries(putData.items);
          }
          clearGuest();
        }

        if (!cancelled) {
          if (listData.removed > 0 && typeof console !== 'undefined') {
            console.warn(`wishlist: server removed ${listData.removed} unavailable favourite(s)`);
          }
          adoptServerState(uid, finalEntries);
          hydratedFor.current = token;
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
    };
  }, [token, userId, adoptServerState]);

  // Persist display always. Logged in: write-through sync — every heart/
  // un-heart fires an immediate PUT (leading edge) so the DB is always ready
  // for the next reload, plus a trailing debounced PUT that coalesces rapid
  // bursts and heals failed immediates.
  useEffect(() => {
    persistEntries(items);
    if (!token) {
      const transitioned = Boolean(persistPrevToken.current);
      persistPrevToken.current = token;
      if (transitioned) return; // logout commit: logout effect owns storage here
      if (logoutClearRef.current) {
        logoutClearRef.current = false;
        if (items.length === 0) return; // post-logout clear: keep guest buffer
      }
      return; // guests own guestPairs via toggleFav; nothing to sync
    }
    persistPrevToken.current = token;
    if (!userId || syncingRef.current || hydratedToken.current !== token) return;
    const ids = idsOf(items);
    // Guard: non-empty display with zero mappable ids must never PUT [].
    if (items.length > 0 && ids.length === 0) return;
    const body = JSON.stringify({ ids });
    if (body === lastSyncedJson.current) return;
    const snapshot = items;
    const snapshotUid = userId;
    const stashAsGuests = (entries) => {
      try {
        const existing = readGuestPairs();
        const have = new Set(existing.map((p) => String(p.id)));
        const next = [...existing];
        for (const e of entries) {
          const id = entryId(e);
          if (id && !have.has(id)) {
            next.push({ id, slug: (e.product && e.product.slug) || '' });
            have.add(id);
          }
        }
        localStorage.setItem(GUEST_KEY, JSON.stringify(next));
        setGuestPairs(next);
      } catch {
        // private mode — memory only
      }
    };
    const pushBody = async (payload, seq) => {
      // Serialized with other writes + retried with backoff on 409/429/5xx.
      await writeQueueRef.current(async () => {
        if (payload === lastSyncedJson.current) return; // sealed while queued
        let res;
        try {
          res = await fetchWrite(apiUrl('/api/wishlist'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: payload,
          });
        } catch {
          return; // offline throughout retries — next change retries; intact
        }
        if (res.status === 401 || res.status === 403) {
          // Dead session: drop it and keep hearts as guest favourites
          // (union back on next login) instead of silently un-hearting.
          stashAsGuests(snapshot);
          logout();
          return;
        }
        if (!res.ok) return; // exhausted retries — next change retries
        const data = await res.json().catch(() => ({}));
        if (data && data.droppedAll) {
          if (typeof console !== 'undefined') {
            console.warn('wishlist: server refused all ids (unavailable products); keeping local copy');
          }
          return; // leave last-synced untouched so the hearts are re-offered
        }
        if (data && data.dropped > 0 && typeof console !== 'undefined') {
          console.warn(`wishlist: server dropped ${data.dropped} unavailable favourite(s)`);
        }
        if (seq === pushSeqRef.current) {
          lastSyncedJson.current = payload;
          persistSynced(snapshotUid, snapshot);
        }
      });
    };
    // Leading edge: immediate write-through on every wishlist action.
    const seq = ++pushSeqRef.current;
    pushBody(body, seq);
    // Trailing edge: coalesces bursts and heals a failed immediate. Skipped
    // while a hydration merge owns the server conversation.
    const t = setTimeout(() => {
      if (syncingRef.current) return;
      if (body === lastSyncedJson.current) return;
      pushBody(body, ++pushSeqRef.current);
    }, 800);
    return () => clearTimeout(t);
  }, [items, token, userId, logout]);

  // Refresh/close with a save still inside the 800ms debounce: flush the
  // latest display now. Same-origin only (Vite proxy / single-domain prod),
  // so keepalive carries the auth header with no preflight involved.
  // NOTE: pagehide only — a beforeunload listener blocks the back/forward
  // cache and trips the DevTools Issues panel; pagehide fires on the same
  // hide/close paths without opting the page out of bfcache.
  useEffect(() => {
    const onUnload = () => {
      const t = tokenRef.current;
      const list = itemsRef.current || [];
      if (!t) return;
      if (hydratedToken.current !== t) return; // never synced here; server is newer
      const ids = idsOf(list);
      if (list.length > 0 && ids.length === 0) return; // never wipe with []
      const body = JSON.stringify({ ids });
      if (body === lastSyncedJson.current) return; // nothing new since last agreement
      if (list.length === 0 && !lastSyncedJson.current) return; // empty throughout
      try {
        fetch(apiUrl('/api/wishlist'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body,
          keepalive: true,
        });
      } catch {
        // unload path — best effort only
      }
    };
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
    };
  }, []);

  // Cross-tab sync: server is truth when logged in (ignore local echo to
  // avoid stale PUT clobber); guests converge via storage while logged out.
  useEffect(() => {
    const onStorage = (e) => {
      if (token) return;
      if (e.key === GUEST_KEY) {
        try {
          const list = e.newValue ? JSON.parse(e.newValue) : [];
          setGuestPairs(Array.isArray(list) ? list.filter((p) => p && p.id) : []);
        } catch {
          // ignore corrupt payloads from other tabs
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [token]);

  const ids = idsOf(items);

  const isFav = useCallback(
    (id) => (id ? ids.includes(String(id)) || (!token && guestPairs.some((p) => p.id === String(id))) : false),
    [ids, guestPairs, token]
  );

  // Optimistic-only toggle: updates the display immediately; the
  // write-through effect above owns the debounced PUT. Guests mutate the
  // local pair list directly.
  const toggleFav = useCallback(
    async (product) => {
      const id = product && (product._id || product.id) ? String(product._id || product.id) : '';
      if (!id) return;
      if (!token) {
        const exists = guestPairs.some((p) => p.id === id);
        persistGuests(
          exists
            ? guestPairs.filter((p) => p.id !== id)
            : [...guestPairs, { id, slug: product.slug || '' }].slice(0, MAX_FAVS)
        );
        return;
      }
      const wasFav = ids.includes(id);
      if (wasFav) {
        setItems((prev) => prev.filter((e) => entryId(e) !== id));
      } else {
        const optimistic = { product, addedAt: new Date().toISOString() };
        setItems((prev) => {
          if (prev.some((e) => entryId(e) === id)) return prev;
          return [{ ...optimistic }, ...prev].slice(0, MAX_FAVS);
        });
      }
    },
    [token, ids, guestPairs, persistGuests]
  );

  // Favourite -> bag (Myntra-style). The variant/size choice comes from the
  // caller (wishlist row defaults or PDP); ring sizes without a choice
  // deep-link to the PDP instead of calling this. Deduped per product so a
  // rapid double-click awaits the first move instead of racing it.
  const moveFavToBag = useCallback(
    (product, selection) => opDedupeRef.current(`move:${String((product && (product._id || product.id)) || '')}`, async () => {
      const opToken = tokenRef.current;
      const id = product && (product._id || product.id) ? String(product._id || product.id) : '';
      if (!id) return false;
      const sel = selection || {};
      const variant = sel.variant || (Array.isArray(product.variants) ? product.variants[0] : null);
      const key = `${product.slug}|${variant?.material || variant?.name || 'default'}|${variant?.kt || '14KT'}|${sel.size || ''}`;
      const line = {
        key,
        variant: variant
          ? { name: variant.name, material: variant.material, kt: variant.kt, price: variant.price, image: variant.image }
          : undefined,
        size: sel.size,
        qty: sel.qty || 1,
      };
      if (!opToken) return false; // guests add to bag straight from the wishlist page
      // Optimistic removal; refresh() below adopts server truth and seals sync.
      const prev = itemsRef.current || [];
      setItems((cur) => cur.filter((e) => entryId(e) !== id));
      try {
        // Serialized + retried (409/429/5xx) like every other wishlist write.
        const res = await writeQueueRef.current(() =>
          fetchWrite(apiUrl('/api/wishlist/move-to-bag'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
            body: JSON.stringify({ product: id, line }),
          })
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.message || 'Move to bag failed');
          err.code = res.status;
          throw err;
        }
        if (tokenRef.current !== opToken) return true; // logged out mid-flight: server won, display owned by logout
        const fromServerLine = (l) =>
          l && typeof l.key === 'string' && l.product
            ? { key: l.key, product: l.product, variant: l.variant || null, size: l.size, quantity: Math.min(10, Math.max(1, Math.floor(Number(l.qty)) || 1)) }
            : null;
        const returnedKeys = new Set(
          ((data.bag && data.bag.items) || []).map((l) => l && l.key)
        );
        if (!returnedKeys.has(line.key)) {
          // Server dropped our line (stale catalog/cap race) — re-offer it
          // once via whole-bag PUT instead of silently losing the move.
          const base = ((data.bag && data.bag.items) || []).map((l) => ({
            key: l.key,
            product: l.product && (l.product._id || l.product),
            variant: l.variant,
            size: l.size,
            qty: l.qty,
          }));
          const healRes = await writeQueueRef.current(() =>
            fetchWrite(apiUrl('/api/bag'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
              body: JSON.stringify([
                ...base,
                { key: line.key, product: id, variant: line.variant, size: line.size, qty: line.qty },
              ]),
            })
          );
          const healData = await healRes.json().catch(() => ({}));
          if (!healRes.ok || !Array.isArray(healData.items)) {
            const err = new Error(healData.message || 'Move to bag failed');
            err.code = healRes.status;
            throw err;
          }
          const healedKeys = new Set((healData.items || []).map((l) => l && l.key));
          if (!healedKeys.has(line.key)) throw new Error('Move to bag failed');
          if (tokenRef.current !== opToken) return true;
          adoptBagState(
            (healData.items || []).map(fromServerLine).filter(Boolean),
            ((healData.saved || []).map(fromServerLine).filter(Boolean))
          );
        } else {
          adoptBagState(
            ((data.bag && data.bag.items) || []).map(fromServerLine).filter(Boolean),
            ((data.bag && data.bag.saved) || []).map(fromServerLine).filter(Boolean)
          );
        }
        await refresh();
        return true;
      } catch {
        if (tokenRef.current !== opToken) return false; // logout owns display now; never resurrect into it
        setItems(prev); // revert optimistic removal
        return false;
      }
    }),
    [adoptBagState, refresh]
  );

  const count = token ? ids.length : guestPairs.length;

  return (
    <WishlistContext.Provider value={{ items, ids, guestPairs, isFav, toggleFav, moveFavToBag, refresh, count, hydrating }}>
      {children}
    </WishlistContext.Provider>
  );
};
