import { useState, createContext, useContext, useEffect, useRef } from 'react';
import { apiUrl, MAX_CART_QTY } from '../config';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const STORAGE_KEY = 'etherstar-cart';

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

// Cart follows the account: guests persist in localStorage, members sync to
// the server. Guest lines merge once at login; logout keeps the last state
// locally so nothing vanishes.
export const CartProvider = ({ children }) => {
  const { token } = useAuth();
  const [items, setItems] = useState(readStored);
  const mergedForToken = useRef(null);
  const syncingRef = useRef(false);
  const hydratedToken = useRef(null);
  const lastSyncedJson = useRef('');

  // Login: merge guest lines once, then the server is the source of truth.
  useEffect(() => {
    if (!token) {
      mergedForToken.current = null;
      hydratedToken.current = null;
      return;
    }
    if (mergedForToken.current === token) return;
    mergedForToken.current = token;
    let cancelled = false;
    syncingRef.current = true;
    (async () => {
      try {
        const guest = readStored()
          .map(toServerLine)
          .filter((l) => l.product);
        const res = await fetch(apiUrl('/api/cart/merge'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: guest }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(data.items)) {
          const mapped = data.items.map(fromServerLine).filter(Boolean);
          hydratedToken.current = token;
          lastSyncedJson.current = JSON.stringify(mapped.map(toServerLine));
          setItems(mapped);
          persist(mapped);
        } else if (!cancelled) {
          mergedForToken.current = null; // retry next mount
        }
      } catch {
        if (!cancelled) mergedForToken.current = null;
      } finally {
        if (!cancelled) syncingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Persist locally always (logout seed + guest mode); push to server when
  // logged in, debounced, skipping echo of what we just pulled.
  useEffect(() => {
    persist(items);
    if (!token || syncingRef.current || hydratedToken.current !== token) return;
    const body = JSON.stringify(items.map(toServerLine).filter((l) => l.product));
    if (body === lastSyncedJson.current) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl('/api/cart'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body,
        });
        if (res.ok) lastSyncedJson.current = body;
      } catch {
        // offline — retry on next change; local copy is intact
      }
    }, 800);
    return () => clearTimeout(t);
  }, [items, token]);

  // Cross-tab sync (guest/local channel)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
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
  }, []);

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

  const clearCart = () => setItems([]);

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
