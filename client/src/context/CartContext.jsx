import { useState, createContext, useContext, useEffect } from 'react';

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

const buildKey = (product, variant) =>
  `${product.slug}|${variant?.name || 'default'}|${variant?.kt || '14KT'}|${variant?.price ?? product.price}`;

function loadInitial() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((it) => it && typeof it.key === 'string' && it.product && it.product.slug)
      .map((it) => ({
        key: String(it.key),
        product: it.product,
        variant: it.variant || null,
        quantity: sanitizeQty(it.quantity),
      }));
  } catch {
    return [];
  }
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // QuotaExceeded / private mode — cart stays in memory
    }
  }, [items]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const next = JSON.parse(e.newValue);
        if (Array.isArray(next)) setItems(next);
      } catch {
        // ignore corrupt payloads from other tabs
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = (product, variant, quantity = 1) => {
    const qty = sanitizeQty(quantity);
    const resolvedVariant = variant || product.variants?.[0] || null;
    const key = buildKey(product, resolvedVariant);
    setItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key
            ? { ...item, quantity: sanitizeQty(item.quantity + qty) }
            : item
        );
      }
      // Snapshot the product as passed (always fresh from the live PDP)
      return [
        ...prev,
        { key, product, variant: resolvedVariant, quantity: qty },
      ];
    });
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const updateQuantity = (key, quantity) => {
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty <= 0) return removeItem(key);
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: sanitizeQty(qty) } : item))
    );
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

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
};
