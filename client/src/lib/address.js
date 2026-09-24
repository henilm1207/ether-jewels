// Client mirror of server/lib/address.js — same required fields and
// postal-code rules, so errors show inline before the server rejects.

export const NO_ZIP = new Set(['AE', 'QA', 'HK', 'IE', 'PA', 'BS', 'AO', 'FJ', 'GH', 'JM', 'MO', 'ZW']);
const ZIP_RE = {
  IN: /^[1-9][0-9]{5}$/,
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/,
  AU: /^\d{4}$/,
};
const LOOSE_ZIP_RE = /^[0-9A-Za-z][0-9A-Za-z\s-]{1,11}$/;
const PHONE_RE = /^[+]?[0-9\s\-()]{7,20}$/;

// True once the typed code is complete enough to look up.
export function zipLooksComplete(countryCode, zip) {
  const z = String(zip || '').trim();
  const re = ZIP_RE[countryCode];
  return re ? re.test(z) : z.length >= 3;
}

export const emptyAddress = (countryCode = 'IN') => ({
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  area: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  countryCode,
  label: 'home',
});

// { field: message } — empty object when valid. `withContact` also checks
// the recipient name/phone (off at checkout, where contact is collected above).
export function validateAddress(a, { withContact = true } = {}) {
  const e = {};
  const v = (k) => String((a && a[k]) || '').trim();
  if (withContact && !v('fullName')) e.fullName = 'Required';
  if (withContact && v('phone') && !PHONE_RE.test(v('phone'))) e.phone = 'Invalid phone number';
  if (!v('countryCode')) e.countryCode = 'Required';
  if (v('line1').length < 3) e.line1 = v('line1') ? 'Enter your flat / house no. and building' : 'Required';
  if (v('line2').length < 3) e.line2 = v('line2') ? 'Enter your street / area' : 'Required';
  if (!v('city')) e.city = 'Required';
  if (!v('state')) e.state = 'Required';
  const cc = v('countryCode');
  const zip = v('zip');
  if (!zip) {
    if (!NO_ZIP.has(cc)) e.zip = 'Required';
  } else if (!(ZIP_RE[cc] || LOOSE_ZIP_RE).test(zip)) {
    e.zip = cc === 'IN' ? 'Enter a valid 6-digit PIN code' : 'Enter a valid postal code';
  }
  return e;
}

// Display lines for cards / order detail. Tolerates legacy orders that
// only have line1/city/zip/country.
export function formatAddressLines(a) {
  if (!a) return [];
  const cityLine = [a.city, a.state].filter(Boolean).join(', ') + (a.zip ? ` ${a.zip}` : '');
  return [
    [a.line1, a.line2].filter(Boolean).join(', '),
    [a.area && a.area !== a.city ? a.area : '', a.landmark ? `Near ${a.landmark}` : ''].filter(Boolean).join(' · '),
    cityLine.trim(),
    a.country,
  ].filter(Boolean);
}

// Only the fields the server stores — strips _id/isDefault/label etc.
export function toShippingPayload(a) {
  const out = {};
  for (const k of ['fullName', 'phone', 'line1', 'line2', 'landmark', 'area', 'city', 'state', 'zip', 'country', 'countryCode']) {
    const v = String((a && a[k]) || '').trim();
    if (v) out[k] = v;
  }
  return out;
}
