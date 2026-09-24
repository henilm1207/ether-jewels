import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { METALS } from '../../lib/metals';
import { Notice, SectionTitle } from './shared';

// US ring sizes — mirrors server DEFAULT_RING_SIZES (config/catalog.js).
const RING_SIZES = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9'];

const TOGGLES = [
  { key: 'email', label: 'Order & offer emails', hint: 'New collections, private sales and birthday offers.' },
  { key: 'whatsapp', label: 'WhatsApp updates', hint: 'Order updates and occasional offers on WhatsApp.' },
  { key: 'newsletter', label: 'Monthly newsletter', hint: 'Jewellery care tips, stories and new arrivals.' },
];

// /account/preferences — ring size, preferred metal, communication opt-ins.
export default function Preferences() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user)
      setForm({
        ringSize: user.ringSize || '',
        preferredMetal: user.preferredMetal || '',
        marketing: { email: true, whatsapp: true, newsletter: false, ...(user.marketing || {}) },
      });
  }, [user]);

  if (!form) return null;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await updateProfile(form);
      setMsg('Preferences saved ✓');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle title="Preferences" subtitle="We use these to pre-select options and tailor what we send you." />
      <Notice>{msg}</Notice>
      <Notice kind="error">{error}</Notice>
      <form onSubmit={save}>
        <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '10px' }}>Ring size (US)</p>
        <div className="flex flex-wrap" style={{ gap: '8px', marginBottom: '8px' }} role="radiogroup" aria-label="Ring size">
          {['', ...RING_SIZES].map((s) => (
            <button
              key={s || 'none'}
              type="button"
              role="radio"
              aria-checked={form.ringSize === s}
              onClick={() => setForm({ ...form, ringSize: s })}
              className={`text-[13px] border ${form.ringSize === s ? 'bg-[#222] text-white border-[#222]' : 'bg-white border-[#ededed] hover:border-[#222]'}`}
              style={{ minWidth: '44px', minHeight: '40px', padding: '0 12px' }}
            >
              {s || 'Not sure'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500" style={{ marginBottom: '28px' }}>
          Don't know your size? <Link to="/pages/ring-size-guide" className="underline">Use our ring size guide</Link>.
        </p>

        <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '10px' }}>Preferred metal</p>
        <div className="flex flex-wrap" style={{ gap: '8px', marginBottom: '28px' }} role="radiogroup" aria-label="Preferred metal">
          {[{ name: '', swatch: null }, ...METALS].map((m) => (
            <button
              key={m.name || 'none'}
              type="button"
              role="radio"
              aria-checked={form.preferredMetal === m.name}
              onClick={() => setForm({ ...form, preferredMetal: m.name })}
              className={`inline-flex items-center text-[13px] border ${form.preferredMetal === m.name ? 'border-[#222] bg-[#f7f2ef]' : 'border-[#ededed] hover:border-[#222]'}`}
              style={{ gap: '8px', minHeight: '40px', padding: '0 14px' }}
            >
              {m.swatch && <span className="rounded-full border border-black/10" style={{ width: '14px', height: '14px', background: m.swatch }} aria-hidden="true" />}
              {m.name || 'No preference'}
            </button>
          ))}
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '10px' }}>Communication</p>
        <div className="border border-[#ededed] divide-y divide-[#ededed]" style={{ marginBottom: '24px' }}>
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-start cursor-pointer" style={{ gap: '12px', padding: '14px' }}>
              <input
                type="checkbox"
                checked={!!form.marketing[t.key]}
                onChange={(e) => setForm({ ...form, marketing: { ...form.marketing, [t.key]: e.target.checked } })}
                style={{ marginTop: '3px' }}
              />
              <span>
                <span className="block text-sm">{t.label}</span>
                <span className="block text-xs text-gray-500">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <button type="submit" disabled={saving} className="btn btn--primary disabled:opacity-50">{saving ? 'Saving…' : 'Save preferences'}</button>
      </form>
    </>
  );
}
