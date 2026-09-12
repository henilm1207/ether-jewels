import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../config';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);
const GUEST_KEY = 'ether-wishlist';

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

// Favorites for everyone: guests persist in localStorage, logged-in users
// sync to the server. Guest picks merge into the account once at login.
export const WishlistProvider = ({ children }) => {
  const { token, user, logout } = useAuth();
  const [ids, setIds] = useState(() => (user && Array.isArray(user.wishlist) ? user.wishlist.map(String) : []));
  const [guestPairs, setGuestPairs] = useState(readGuestPairs);
  const mergedForToken = useRef(null);

  const persistGuests = useCallback((pairs) => {
    setGuestPairs(pairs);
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(pairs));
    } catch {
      // private mode — memory only
    }
  }, []);

  // Server is the source of truth when logged in; one-shot guest merge.
  useEffect(() => {
    if (!token) {
      mergedForToken.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const pairs = readGuestPairs();
      if (pairs.length && mergedForToken.current !== token) {
        mergedForToken.current = token;
        try {
          const res = await fetch(apiUrl('/api/auth/wishlist/merge'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ids: pairs.map((p) => p.id) }),
          });
          const data = await res.json().catch(() => ({}));
          if (!cancelled && res.ok && Array.isArray(data.wishlist)) {
            setIds(data.wishlist.map(String));
            persistGuests([]);
            return;
          }
        } catch {
          // offline — keep guest list, retry next mount
          mergedForToken.current = null;
        }
      }
      if (!cancelled && user && Array.isArray(user.wishlist)) {
        setIds(user.wishlist.map(String));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Logout: drop server ids, keep any guest list as-is.
  // Server truth sync: AuthContext may deliver user (with wishlist) after
  // mount via /me revalidation — follow it whenever it changes, otherwise
  // hearts wrongly show empty for sessions stored before this feature.
  const userWishlistKey = user && Array.isArray(user.wishlist) ? user.wishlist.map(String).join(',') : null;
  useEffect(() => {
    if (!token) {
      setIds([]);
      return;
    }
    // null = user not loaded yet — keep current (optimistic/merged) state.
    if (userWishlistKey !== null) setIds(userWishlistKey ? userWishlistKey.split(',') : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userWishlistKey]);

  const isFav = useCallback(
    (id) => (id ? ids.includes(String(id)) || (!token && guestPairs.some((p) => p.id === String(id))) : false),
    [ids, guestPairs, token]
  );

  const toggleFav = useCallback(
    async (product) => {
      const id = product && (product._id || product.id) ? String(product._id || product.id) : '';
      if (!id) return;
      if (!token) {
        const exists = guestPairs.some((p) => p.id === id);
        persistGuests(
          exists
            ? guestPairs.filter((p) => p.id !== id)
            : [...guestPairs, { id, slug: product.slug || '' }]
        );
        return;
      }
      const wasFav = ids.includes(id);
      setIds(wasFav ? ids.filter((w) => w !== id) : [...ids, id]); // optimistic
      try {
        const res = await fetch(apiUrl(`/api/auth/wishlist/${id}`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.message || 'Wishlist update failed');
          err.code = res.status;
          throw err;
        }
        if (Array.isArray(data.wishlist)) setIds(data.wishlist.map(String));
      } catch (err) {
        if (err && err.code === 401) {
          // Dead session: drop it and keep the heart as a guest favorite
          // (merges back on next login) instead of silently un-hearting.
          logout();
          setIds(ids.filter((w) => w !== id));
          if (!guestPairs.some((p) => p.id === id)) {
            persistGuests([...guestPairs, { id, slug: product.slug || '' }]);
          }
        } else {
          setIds(wasFav ? [...ids, id] : ids.filter((w) => w !== id)); // revert
        }
      }
    },
    [token, ids, guestPairs, persistGuests, logout]
  );

  const count = token ? ids.length : guestPairs.length;

  return (
    <WishlistContext.Provider value={{ ids, guestPairs, isFav, toggleFav, count }}>
      {children}
    </WishlistContext.Provider>
  );
};
