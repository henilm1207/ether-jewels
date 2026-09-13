import { useState, createContext, useContext, useEffect, useRef } from 'react';
import { apiUrl, MAX_CART_QTY } from '../config';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const STORAGE_KEY = 'etherstar-cart';
const GUEST_KEY = 'etherstar-cart-guest';
const syncedKeyFor = (userId) => `etherstar-cart-synced-${userId || 'anon'}`;

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};

const sanitizeQty = (q) => {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, n));
};

// Key identifies the buyable configuration (metal + karat + size) — never the
// price, so a price edit can't fork duplicate lines for the same choice.
const buildKey = (product, variant, size) =>
  `${product.slug}|${variant?.material || variant?.name || 'default'}|${variant?.kt || '14KT'}|${size || ''}`;

function sanitizeItem(it) {
  if (!it || typeof it.key !== 'string' || !it.product || !it.product.slug) return null;
  return {
    key: String(it.key),
    product: it.product,
    variant: it.variant || null,
    size: typeof it.size === 'string' && it.size ? it.size : undefined,
    quantity: sanitizeQty(it.quantity),
  };
}

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return [];
    return raw.map(sanitizeItem).filter(Boolean);
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // QuotaExceeded / private mode — cart stays in memory
  }
}

function readGuest() {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY));
    if (!Array.isArray(raw)) return [];
    return raw.map(sanitizeItem).filter(Boolean);
  } catch {
    return [];
  }
}

function persistGuest(items) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  } catch {
    // private mode — guest cart stays in memory
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
    return Array.isArray(raw) ? raw.map(sanitizeItem).filter(Boolean) : null;
  } catch {
    return null;
  }
}

function persistSynced(userId, items) {
  try {
    localStorage.setItem(syncedKeyFor(userId), JSON.stringify(items));
  } catch {
    // ignore
  }
}

// Server line shape (account cart). Snapshots stay light — checkout
// re-prices everything, so stored prices can't leak through.
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

// Cart follows the account: logout clears display to 0, guests persist in
// localStorage (survives reload), members sync to the server. Login restores
// server truth; guest lines win per key (1 stays 1, never doubles).
export const CartProvider = ({ children }) => {
  const { token, user } = useAuth();
  const userId = user?._id || user?.id || null;
  const [items, setItems] = useState(readStored);
  const mergedForUser = useRef(null);
  const syncingRef = useRef(false);
  const hydratedToken = useRef(null);
  const lastSyncedJson = useRef('');
  const prevTokenRef = useRef(token);

  // Logout: clear display to 0. Server cart untouched, synced snapshot kept
  // for next login. Guest buffer left alone (empty after logged-in use).
  // Guarded by prev-token transition so reload-as-guest never wipes guest 2.
  useEffect(() => {
    const prev = prevTokenRef.current;
    prevTokenRef.current = token;
    if (!token && prev) {
      mergedForUser.current = null;
      hydratedToken.current = null;
      lastSyncedJson.current = '';
      setItems([]);
      persist([]);
    } else if (!token) {
      mergedForUser.current = null;
      hydratedToken.current = null;
    }
  }, [token]);

  // Login: server is truth. Guest buffer (logged-out adds only) wins per key,
  // new SKUs union. Empty guest -> GET only, so 1 stays 1 across relogin.
  useEffect(() => {
    if (!token) return;
    if (!userId) return; // wait for /me so merge is keyed by stable user id
    if (mergedForUser.current === userId && hydratedToken.current === token) return;
    mergedForUser.current = userId;
    let cancelled = false;
    syncingRef.current = true;
    (async () => {
      try {
        if (!lastSyncedJson.current) {
          const persisted = readSynced(userId);
          if (persisted) lastSyncedJson.current = JSON.stringify(persisted.map(toServerLine));
        }
        const getRes = await fetch(apiUrl('/api/cart'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const getData = await getRes.json().catch(() => ({}));
        if (!getRes.ok || !Array.isArray(getData.items)) throw new Error('cart fetch failed');
        const serverItems = getData.items.map(fromServerLine).filter(Boolean);
        const guestItems = readGuest();

        let finalItems = serverItems;
        if (guestItems.length > 0) {
          const byKey = new Map(serverItems.map((it) => [it.key, it]));
          for (const g of guestItems) {
            if (byKey.has(g.key)) {
              // Guest wins same key: qty 2 stays 2 (never sums to 4).
              byKey.set(g.key, { ...byKey.get(g.key), quantity: sanitizeQty(g.quantity) });
            } else if (byKey.size < 20) {
              byKey.set(g.key, g);
            }
          }
          finalItems = [...byKey.values()];
          const putBody = JSON.stringify(finalItems.map(toServerLine).filter((l) => l.product));
          const putRes = await fetch(apiUrl('/api/cart'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: putBody,
          });
          const putData = await putRes.json().catch(() => ({}));
          if (!putRes.ok || !Array.isArray(putData.items)) throw new Error('cart sync failed');
          finalItems = putData.items.map(fromServerLine).filter(Boolean);
          clearGuest();
        }

        if (!cancelled) {
          hydratedToken.current = token;
          lastSyncedJson.current = JSON.stringify(finalItems.map(toServerLine));
          persistSynced(userId, finalItems);
          setItems(finalItems);
          persist(finalItems);
        }
      } catch {
        if (!cancelled) mergedForUser.current = null; // retry on next mount/token change
      } finally {
        if (!cancelled) syncingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  // Persist display always (guest survives reload via mirrored guest buffer
  // while logged out); push to server when logged in, debounced, skipping
  // echo of what we just pulled.
  useEffect(() => {
    persist(items);
    if (!token) {
      persistGuest(items);
      return;
    }
    if (!userId || syncingRef.current || hydratedToken.current !== token) return;
    const body = JSON.stringify(items.map(toServerLine).filter((l) => l.product));
    if (body === lastSyncedJson.current) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl('/api/cart'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body,
        });
        if (res.ok) {
          lastSyncedJson.current = body;
          persistSynced(userId, items);
        }
      } catch {
        // offline — retry on next change; local copy is intact
      }
    }, 800);
    return () => clearTimeout(t);
  }, [items, token, userId]);

  // Cross-tab sync: server is truth when logged in (ignore local echo to
  // avoid stale PUT clobber); guests converge via storage while logged out.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (token) return;
      try {
        const next = JSON.parse(e.newValue);
        if (Array.isArray(next)) {
          const clean = next.map(sanitizeItem).filter(Boolean);
          setItems(clean);
        }
      } catch {
        // ignore corrupt payloads from other tabs
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [token]);

  const cartTotal = (list) => list.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  // Whole-cart cap: returns false (and changes nothing) when the change
  // would push the cart over MAX_CART_QTY — callers redirect to Contact.
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

  const clearCart = () => {
    clearGuest();
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal =
    Math.round(
      items.reduce((sum, item) => {
        const unit = Number(item.variant?.price ?? item.product.price) || 0;
        return sum + unit * (Number(item.quantity) || 0);
      }, 0) * 100
    ) / 100;

  // True for pre-existing carts already over the cap (e.g. stored before the
  // limit shipped) — UI gates checkout to Contact instead of rewriting data.
  const limitExceeded = totalItems > MAX_CART_QTY;

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, limitExceeded, maxCartQty: MAX_CART_QTY }}
    >
      {children}
    </CartContext.Provider>
  );
};
