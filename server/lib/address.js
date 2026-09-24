// Single source of truth for the postal address shape — used by saved
// addresses (User.addresses), checkout validation (quote.js) and the
// order's frozen shippingAddress copy. Client mirror: client/src/lib/address.js.

const LIMITS = {
  fullName: 100,
  phone: 30,
  line1: 200,
  line2: 200,
  landmark: 120,
  area: 100,
  city: 100,
  state: 100,
  zip: 20,
  country: 100,
  countryCode: 2,
};

const REQUIRED = ['fullName', 'line1', 'line2', 'city', 'state', 'zip', 'country', 'countryCode'];
const MIN_LINE = 3;

// Per-country postal code formats; everything else gets a loose check.
const ZIP_RE = {
  IN: /^[1-9][0-9]{5}$/,
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/,
  AU: /^\d{4}$/,
};
// Countries with no postal code system — zip optional there.
const NO_ZIP = new Set(['AE', 'QA', 'HK', 'IE', 'PA', 'BS', 'AO', 'FJ', 'GH', 'JM', 'MO', 'ZW']);
const LOOSE_ZIP_RE = /^[0-9A-Za-z][0-9A-Za-z\s-]{1,11}$/;
const PHONE_RE = /^[+]?[0-9\s\-()]{7,20}$/;

const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '');

// Returns { ok, value, errors } — errors keyed by field for inline display.
function normalizeAddress(input) {
  const src = input && typeof input === 'object' ? input : {};
  const value = {};
  for (const [k, max] of Object.entries(LIMITS)) value[k] = str(src[k], max);
  value.countryCode = value.countryCode.toUpperCase();
  if (value.countryCode === 'IN' || value.countryCode === 'US') value.zip = value.zip.replace(/\s+/g, '');
  if (value.countryCode === 'CA' || value.countryCode === 'GB') value.zip = value.zip.toUpperCase();

  const errors = {};
  for (const f of REQUIRED) if (!value[f] && !(f === 'zip' && NO_ZIP.has(value.countryCode))) errors[f] = 'Required';
  if (value.line1 && value.line1.length < MIN_LINE) errors.line1 = 'Enter your flat / house no. and building';
  if (value.line2 && value.line2.length < MIN_LINE) errors.line2 = 'Enter your street / area';
  if (value.countryCode && !/^[A-Z]{2}$/.test(value.countryCode)) errors.countryCode = 'Invalid country';
  if (value.zip) {
    const re = ZIP_RE[value.countryCode] || LOOSE_ZIP_RE;
    if (!re.test(value.zip)) errors.zip = value.countryCode === 'IN' ? 'Enter a valid 6-digit PIN code' : 'Enter a valid postal code';
  }
  if (value.phone && !PHONE_RE.test(value.phone)) errors.phone = 'Invalid phone number';

  for (const k of Object.keys(value)) if (value[k] === '') delete value[k];
  return { ok: Object.keys(errors).length === 0, value, errors };
}

// Case/space-insensitive identity — used to dedupe "save this address".
function addressKey(a) {
  return ['line1', 'line2', 'city', 'zip', 'countryCode']
    .map((k) => String((a && a[k]) || '').toLowerCase().replace(/\s+/g, ' ').trim())
    .join('|');
}

const MAX_SAVED = 10;

// Checkout "save this address to my account": idempotent (skips duplicates)
// and best-effort — a failure here must never fail the order.
async function saveAddressForUser(userId, addr) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('addresses');
    if (!user || user.addresses.length >= MAX_SAVED) return;
    const key = addressKey(addr);
    if (user.addresses.some((a) => addressKey(a) === key)) return;
    user.addresses.push({ ...addr, label: 'home', isDefault: user.addresses.length === 0 });
    await user.save();
  } catch (e) {
    console.error(`saveAddressForUser failed for ${userId}:`, e.message);
  }
}

module.exports = { LIMITS, REQUIRED, NO_ZIP, MAX_SAVED, normalizeAddress, addressKey, saveAddressForUser };
