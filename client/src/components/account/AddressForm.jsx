import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { COUNTRIES, REGIONS, countryName, labelsFor } from '../../data/countries';
import { NO_ZIP } from '../../lib/address';
import usePostalLookup from '../../hooks/usePostalLookup';

function Field({ label, error, hint, optional, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[13px] text-gray-700" style={{ marginBottom: '6px' }}>
        {label}
        {optional && <span className="text-gray-400"> (optional)</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="block text-xs text-red-700" style={{ marginTop: '4px' }}>{error}</span>
      ) : hint ? (
        <span className="block text-xs text-gray-500" style={{ marginTop: '4px' }}>{hint}</span>
      ) : null}
    </label>
  );
}

// Structured address entry, shared by Account → Addresses and checkout.
// Pincode first: a successful lookup fills city / state / country and
// offers the post-office areas, locked until the customer taps "Change".
// Controlled — `value` in, `onChange(next)` out; `errors` keyed by field.
export default function AddressForm({ value, onChange, errors = {}, showContact = true, showLabel = true, disabled = false }) {
  const a = value;
  const set = (patch) => onChange({ ...a, ...patch });
  const cc = a.countryCode || 'IN';
  const labels = labelsFor(cc);
  const regions = REGIONS[cc];
  const lookup = usePostalLookup(cc, a.zip);
  const [manual, setManual] = useState(false);
  const appliedKey = useRef('');
  const areas = lookup.status === 'found' ? lookup.data.areas || [] : [];
  const locked = lookup.status === 'found' && !manual;
  // Lock only what the lookup actually filled — the rest stays typeable.
  const cityLocked = locked && !!(lookup.data.city || (lookup.data.areas || []).length === 1);
  const stateLocked = locked && !!lookup.data.state;

  // Apply a fresh lookup once per postal code.
  useEffect(() => {
    if (lookup.status !== 'found' || appliedKey.current === lookup.key) return;
    appliedKey.current = lookup.key;
    setManual(false);
    const d = lookup.data;
    const onlyArea = d.areas && d.areas.length === 1 ? d.areas[0] : '';
    onChange({
      ...a,
      state: d.state || a.state,
      city: d.city || onlyArea || a.city,
      country: countryName(cc),
      area: d.areas && d.areas.includes(a.area) ? a.area : onlyArea,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup]);

  // Keep the country name in sync with the dropdown.
  useEffect(() => {
    if (a.country !== countryName(cc)) set({ country: countryName(cc) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cc]);

  const regionOptions = regions && a.state && !regions.includes(a.state) ? [a.state, ...regions] : regions;
  const zipOptional = NO_ZIP.has(cc);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '14px' }}>
      {showContact && (
        <>
          <Field label="Full name *" error={errors.fullName}>
            <input value={a.fullName || ''} onChange={(e) => set({ fullName: e.target.value })} disabled={disabled} className="form-control" autoComplete="name" />
          </Field>
          <Field label="Phone" optional hint="With country code, for delivery updates" error={errors.phone}>
            <input value={a.phone || ''} onChange={(e) => set({ phone: e.target.value })} disabled={disabled} type="tel" className="form-control" autoComplete="tel" />
          </Field>
        </>
      )}

      <Field label="Country *" error={errors.countryCode}>
        <select
          value={cc}
          onChange={(e) => set({ countryCode: e.target.value, country: countryName(e.target.value), state: '', area: '', zip: '', city: '' })}
          disabled={disabled}
          className="form-control"
          autoComplete="country"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field
        label={`${labels.zip}${zipOptional ? '' : ' *'}`}
        optional={zipOptional}
        error={errors.zip}
        hint={
          lookup.status === 'found'
            ? null
            : lookup.status === 'notfound'
              ? `We couldn't find this ${labels.zip} — please check it, or fill the details below.`
              : lookup.status === 'error'
                ? 'Auto-fill is unavailable right now — please fill the details below.'
                : cc === 'IN'
                  ? 'Enter your 6-digit PIN — we fill in city and state for you.'
                  : null
        }
      >
        <div className="relative">
          <input
            value={a.zip || ''}
            onChange={(e) => set({ zip: cc === 'IN' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value.slice(0, 12) })}
            disabled={disabled}
            inputMode={cc === 'IN' || cc === 'US' ? 'numeric' : 'text'}
            className="form-control"
            style={{ paddingRight: '36px' }}
            autoComplete="postal-code"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">
            {lookup.status === 'loading' && <Loader2 size={16} className="animate-spin" />}
            {lookup.status === 'found' && <Check size={16} className="text-green-700" />}
          </span>
        </div>
      </Field>

      {areas.length > 1 && (
        <Field label={cc === 'IN' ? 'Area / Post office' : 'Locality'} optional={cc === 'IN'} className="sm:col-span-2">
          <select
            value={a.area || ''}
            onChange={(e) => set(cc === 'IN' ? { area: e.target.value } : { area: e.target.value, city: e.target.value })}
            disabled={disabled}
            className="form-control"
          >
            <option value="">Select your area</option>
            {areas.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label={cc === 'IN' ? 'City / District *' : 'City *'} error={errors.city}>
        <input value={a.city || ''} onChange={(e) => set({ city: e.target.value })} disabled={disabled} readOnly={cityLocked} className="form-control read-only:bg-[#f7f7f7]" autoComplete="address-level2" />
      </Field>
      <Field label={`${labels.state} *`} error={errors.state}>
        {regionOptions ? (
          <select value={a.state || ''} onChange={(e) => set({ state: e.target.value })} disabled={disabled || stateLocked} className="form-control disabled:bg-[#f7f7f7]" autoComplete="address-level1">
            <option value="">Select {labels.state.toLowerCase()}</option>
            {regionOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        ) : (
          <input value={a.state || ''} onChange={(e) => set({ state: e.target.value })} disabled={disabled} readOnly={stateLocked} className="form-control read-only:bg-[#f7f7f7]" autoComplete="address-level1" />
        )}
      </Field>
      {(cityLocked || stateLocked) && (
        <p className="sm:col-span-2 text-xs text-gray-500" style={{ marginTop: '-6px' }}>
          Filled from your {labels.zip}.{' '}
          <button type="button" onClick={() => setManual(true)} className="underline">Change</button>
        </p>
      )}

      <Field label="Flat / House no. / Building *" error={errors.line1} className="sm:col-span-2">
        <input value={a.line1 || ''} onChange={(e) => set({ line1: e.target.value })} disabled={disabled} placeholder="e.g. Apt 5B, 350 Park Avenue" className="form-control" autoComplete="address-line1" />
      </Field>
      <Field label="Street / Area / Locality *" error={errors.line2} className="sm:col-span-2">
        <input value={a.line2 || ''} onChange={(e) => set({ line2: e.target.value })} disabled={disabled} placeholder="e.g. Midtown Manhattan" className="form-control" autoComplete="address-line2" />
      </Field>
      <Field label="Landmark" optional className="sm:col-span-2">
        <input value={a.landmark || ''} onChange={(e) => set({ landmark: e.target.value })} disabled={disabled} placeholder="e.g. Near Central Park" className="form-control" />
      </Field>

      {showLabel && (
        <div className="sm:col-span-2">
          <span className="block text-[13px] text-gray-700" style={{ marginBottom: '6px' }}>Save as</span>
          <div className="flex" style={{ gap: '8px' }} role="group" aria-label="Address label">
            {['home', 'work', 'other'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set({ label: l })}
                aria-pressed={a.label === l}
                disabled={disabled}
                className={`text-[13px] capitalize border ${a.label === l ? 'bg-[#222] text-white border-[#222]' : 'bg-white border-[#ededed] hover:border-[#222]'}`}
                style={{ padding: '6px 16px', minHeight: '36px' }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
