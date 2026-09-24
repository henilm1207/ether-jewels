// Country + region data for the address form. Names come from the
// browser's Intl.DisplayNames so only ISO codes are stored here.

const CODES = [
  'IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'IE', 'SE', 'NO',
  'DK', 'FI', 'PT', 'PL', 'CZ', 'GR', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY', 'IS',
  'JP', 'KR', 'CN', 'HK', 'TW', 'MO', 'MY', 'TH', 'PH', 'ID', 'VN', 'LK', 'NP', 'BD', 'PK', 'MV', 'BT', 'SA', 'QA',
  'KW', 'BH', 'OM', 'IL', 'TR', 'EG', 'ZA', 'NG', 'KE', 'GH', 'MU', 'MA', 'TZ', 'UG', 'MX', 'BR', 'AR', 'CL', 'CO',
  'PE', 'UY', 'CR', 'PA', 'DO', 'JM', 'TT', 'BS', 'PR', 'FJ', 'RU', 'UA',
];

let displayNames = null;
try {
  displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  // very old browser — codes shown as-is
}
const nameOf = (code) => (displayNames && displayNames.of(code)) || code;

// India first (home market), then alphabetical.
export const COUNTRIES = [
  { code: 'IN', name: nameOf('IN') },
  ...CODES.filter((c) => c !== 'IN')
    .map((code) => ({ code, name: nameOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name)),
];

export const countryName = (code) => (COUNTRIES.find((c) => c.code === code) || { name: nameOf(code) }).name;

// Best-effort mapping for legacy free-text countries (old drafts / orders).
export function countryCodeFromName(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return '';
  if (/^(india|bharat|in)$/.test(n)) return 'IN';
  if (/^(usa|us|united states( of america)?)$/.test(n)) return 'US';
  if (/^(uk|united kingdom|england|great britain)$/.test(n)) return 'GB';
  if (/^(uae|united arab emirates)$/.test(n)) return 'AE';
  const hit = COUNTRIES.find((c) => c.name.toLowerCase() === n || c.code.toLowerCase() === n);
  return hit ? hit.code : '';
}

export const REGIONS = {
  IN: [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
    'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
    'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal',
  ],
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  CA: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
    'Saskatchewan', 'Yukon',
  ],
  AU: [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia',
    'Tasmania', 'Victoria', 'Western Australia',
  ],
};

// Per-country wording for the region + postal code fields.
export const LABELS = {
  IN: { state: 'State', zip: 'PIN code' },
  US: { state: 'State', zip: 'ZIP code' },
  CA: { state: 'Province', zip: 'Postal code' },
  AU: { state: 'State / Territory', zip: 'Postcode' },
  GB: { state: 'County', zip: 'Postcode' },
};
export const labelsFor = (code) => LABELS[code] || { state: 'State / Province / Region', zip: 'Postal code' };
