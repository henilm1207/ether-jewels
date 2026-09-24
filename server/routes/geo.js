// GET /api/geo/postal/:countryCode/:code — pincode / ZIP → area, city, state.
// India: India Post (api.postalpincode.in) — full post-office list.
// Elsewhere: Zippopotam (api.zippopotam.us, ~60 countries).
// Server-side proxy: no CSP change, one cache for every visitor, and a
// failed/unsupported lookup is just a 404 — the form falls back to manual entry.
const express = require('express');

const router = express.Router();
const TIMEOUT_MS = 4000;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 5000;
const cache = new Map(); // key -> { at, data } (data null = known miss)

// Countries Zippopotam covers (https://api.zippopotam.us/ — "Supported countries").
const ZIPPO = new Set([
  'AD', 'AR', 'AS', 'AT', 'AU', 'BD', 'BE', 'BG', 'BR', 'CA', 'CH', 'CZ', 'DE', 'DK', 'DO', 'ES', 'FI', 'FO', 'FR',
  'GB', 'GF', 'GG', 'GL', 'GP', 'GT', 'GU', 'GY', 'HR', 'HU', 'IM', 'IS', 'IT', 'JE', 'JP', 'LI', 'LK', 'LT', 'LU',
  'MC', 'MD', 'MH', 'MK', 'MP', 'MQ', 'MX', 'MY', 'NL', 'NO', 'NZ', 'PH', 'PK', 'PL', 'PM', 'PR', 'PT', 'RE', 'RU',
  'SE', 'SI', 'SJ', 'SK', 'SM', 'TH', 'TR', 'US', 'VA', 'VI', 'YT', 'ZA',
]);

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const uniq = (arr) => [...new Set(arr.map((v) => String(v || '').trim()).filter(Boolean))];

async function lookupIndia(pin) {
  const json = await fetchJson(`https://api.postalpincode.in/pincode/${pin}`);
  const po = Array.isArray(json) && json[0] && json[0].Status === 'Success' ? json[0].PostOffice || [] : [];
  if (!po.length) return null;
  return {
    countryCode: 'IN',
    country: 'India',
    state: po[0].State || '',
    city: po[0].District || po[0].Block || '',
    areas: uniq(po.map((p) => p.Name)).sort(),
  };
}

// Zippopotam indexes only the outward part of full-format postcodes
// (GB "SW1A 1AA" -> "SW1A", CA "M5V 3L9" -> "M5V", NL "1012 AB" -> "1012").
const OUTWARD = {
  GB: (c) => {
    const z = c.replace(/\s+/g, '');
    return z.length > 4 ? z.slice(0, -3) : z; // already outward-only
  },
  CA: (c) => c.replace(/[\s-]+/g, '').slice(0, 3),
  NL: (c) => c.replace(/\s+/g, '').slice(0, 4),
};

const NEIGHBOURHOOD_NAMES = new Set(['GB', 'CA']);

async function lookupZippo(cc, rawCode) {
  const code = OUTWARD[cc] ? OUTWARD[cc](rawCode) : rawCode;
  const json = await fetchJson(`https://api.zippopotam.us/${cc.toLowerCase()}/${encodeURIComponent(code)}`);
  const places = json && Array.isArray(json.places) ? json.places : [];
  if (!places.length) return null;
  const names = uniq(places.map((p) => p['place name']));
  return {
    countryCode: cc,
    country: json.country || '',
    state: places[0].state || '',
    // Single place = the town; several = localities within one postal area.
    // GB/CA place names are neighbourhoods ("Westminster Abbey"), not towns.
    city: NEIGHBOURHOOD_NAMES.has(cc) ? '' : names.length === 1 ? names[0] : '',
    areas: NEIGHBOURHOOD_NAMES.has(cc) ? [] : names.length > 1 ? names.sort() : [],
  };
}

router.get('/postal/:countryCode/:code', async (req, res, next) => {
  try {
    const cc = String(req.params.countryCode || '').toUpperCase();
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc) || !/^[0-9A-Z -]{2,10}$/.test(code))
      return res.status(400).json({ message: 'Invalid country or postal code' });
    if (cc === 'IN' && !/^[1-9][0-9]{5}$/.test(code))
      return res.status(400).json({ message: 'Enter a valid 6-digit PIN code' });
    if (cc !== 'IN' && !ZIPPO.has(cc)) return res.status(404).json({ message: 'Lookup not available for this country' });

    const key = `${cc}:${code}`;
    const hit = cache.get(key);
    let data;
    if (hit && Date.now() - hit.at < TTL_MS) {
      data = hit.data;
    } else {
      try {
        data = cc === 'IN' ? await lookupIndia(code) : await lookupZippo(cc, code);
      } catch (e) {
        // Upstream down/slow — don't cache, let the customer type it in.
        console.warn(`postal lookup ${key} failed:`, e.message);
        return res.status(503).json({ message: 'Lookup unavailable — please enter the details manually' });
      }
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), data });
    }
    if (!data) return res.status(404).json({ message: 'Postal code not found' });
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(data);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
