import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiUrl } from '../config';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ether-token';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  const saveSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    try {
      if (nextToken) localStorage.setItem(STORAGE_KEY, nextToken);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // private mode — session stays in memory
    }
  }, []);

  const logout = useCallback(() => saveSession(null, null), [saveSession]);

  // Revalidate persisted session against the server
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('expired');
        const me = await res.json();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) saveSession(null, null);
      } finally {
        if (!cancelled) setLoading(false);
      }
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
    <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
