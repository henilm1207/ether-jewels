import { useEffect, useState } from 'react';
import { apiUrl } from '../config';
import { zipLooksComplete } from '../lib/address';

// Debounced pincode / ZIP → { state, city, areas } via /api/geo/postal.
// status: idle | loading | found | notfound | error
export default function usePostalLookup(countryCode, zip, delay = 400) {
  const [result, setResult] = useState({ status: 'idle', data: null, key: '' });
  const code = String(zip || '').trim();
  const key = `${countryCode}:${code.toUpperCase()}`;
  const ready = !!countryCode && zipLooksComplete(countryCode, code);

  useEffect(() => {
    if (!ready) {
      setResult({ status: 'idle', data: null, key: '' });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setResult({ status: 'loading', data: null, key });
      try {
        const res = await fetch(apiUrl(`/api/geo/postal/${countryCode}/${encodeURIComponent(code)}`), { signal: ctrl.signal });
        if (res.ok) setResult({ status: 'found', data: await res.json(), key });
        else setResult({ status: res.status === 404 || res.status === 400 ? 'notfound' : 'error', data: null, key });
      } catch (e) {
        if (e.name !== 'AbortError') setResult({ status: 'error', data: null, key });
      }
    }, delay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, delay]);

  return result;
}
