import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { accountFetch } from '../pages/account/shared';

const BASE = '/api/account/addresses';

// Saved addresses for the signed-in customer. Every mutation returns the
// full updated list from the server, so local state never drifts.
export default function useAddresses() {
  const { token } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    let live = true;
    accountFetch(token, BASE)
      .then((list) => live && setAddresses(Array.isArray(list) ? list : []))
      .catch(() => live && setAddresses([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [token]);

  const run = useCallback(
    async (path, opts) => {
      const list = await accountFetch(token, `${BASE}${path}`, opts);
      setAddresses(list);
      return list;
    },
    [token]
  );

  return {
    addresses,
    loading,
    create: (addr) => run('', { method: 'POST', body: addr }),
    update: (id, addr) => run(`/${id}`, { method: 'PUT', body: addr }),
    remove: (id) => run(`/${id}`, { method: 'DELETE' }),
    makeDefault: (id) => run(`/${id}/default`, { method: 'PATCH' }),
  };
}
