import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiUrl } from '../config';

const AuthContext = createContext(null);
const TOKEN_KEY = 'ether-token';
const USER_KEY = 'ether-user';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });
  // Snapshot keeps you visibly logged in across blips while /me retries.
  const [user, setUser] = useState(() => (token ? readStoredUser() : null));
  const [loading, setLoading] = useState(!!token);

  const saveSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    try {
      if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
      else localStorage.removeItem(TOKEN_KEY);
      if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      else localStorage.removeItem(USER_KEY);
    } catch {
      // private mode — session stays in memory
    }
  }, []);

  const logout = useCallback(() => saveSession(null, null), [saveSession]);

  // Profile settings — server freezes everything while an order is open.
  const updateProfile = useCallback(
    async (payload) => {
      const res = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Update failed');
      saveSession(token, data);
      return data;
    },
    [token, saveSession]
  );

  // Revalidate persisted session. Transient failures (Atlas blip, API
  // restart, dev reload race) retry with backoff and NEVER wipe the session —
  // only a 401/403 (truly dead token) logs out.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(apiUrl('/api/auth/me'), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 401 || res.status === 403) {
            if (!cancelled) saveSession(null, null);
            break;
          }
          if (!res.ok) throw new Error(`me:${res.status}`);
          const me = await res.json();
          if (!cancelled) {
            setUser(me);
            try {
              localStorage.setItem(USER_KEY, JSON.stringify(me));
            } catch { /* private mode */ }
          }
          break;
        } catch (e) {
          const authDead = e && /^(401|403)$/.test(String(e.message || '').replace('me:', ''));
          if (authDead) {
            if (!cancelled) saveSession(null, null);
            break;
          }
          if (attempt === 2 && !cancelled) {
            // Blip survived retries — stay logged in on the snapshot; the
            // next mount or login revalidates again. Never wipe here.
          } else {
            await sleep(1000 * (attempt + 1));
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, saveSession]);

  const login = useCallback(
    async (email, password) => {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Login failed');
      saveSession(data.token, data.user);
      return data.user;
    },
    [saveSession]
  );

  const register = useCallback(
    async (payload) => {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      saveSession(data.token, data.user);
      return data.user;
    },
    [saveSession]
  );

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
