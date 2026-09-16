import { useEffect, useState } from 'react';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Card, Field, inputCls, inputStyle, ErrorMsg } from '../../components/admin/ui';

const EMPTY = {
  goldRate24ktInr: '',
  diamondRatePerCaratInr: '',
  karatPurityPct: { '10KT': 50, '14KT': 65, '18KT': 84 },
  makingChargesPct: 6,
  shippingFlatInr: 5000,
  profitMarginPct: 50,
  profitMarginFlatInr: 50000,
  usdInrRate: 96,
  roundToNearestInr: 500,
  roundToNearestUsd: 50,
};

// Live rate → recompute button: after any save/recompute, shows how many
// products updated and lists the ones that failed (e.g. a stale
// compareAtPrice no longer above the new price) so the admin can fix them.
function RecomputeResult({ result }) {
  if (!result) return null;
  return (
    <div className="text-sm" style={{ marginTop: '14px' }}>
      <p role="status" className="text-green-700">{result.updated} product(s) repriced.</p>
      {result.failed.length > 0 && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded" style={{ padding: '10px 12px', marginTop: '8px' }}>
          <p className="font-medium mb-1">{result.failed.length} product(s) could not be repriced:</p>
          <ul className="list-disc pl-5">
            {result.failed.map((f) => (
              <li key={f.id}>{f.name || f.id}: {f.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Pricing() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPurity = (kt, v) => setForm((f) => ({ ...f, karatPurityPct: { ...f.karatPurityPct, [kt]: v } }));

  useEffect(() => {
    adminFetch('/api/pricing-settings')
      .then((s) => setForm({ ...EMPTY, ...s, karatPurityPct: { ...EMPTY.karatPurityPct, ...s.karatPurityPct } }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setSaving(true);
    try {
      const body = {
        ...form,
        goldRate24ktInr: Number(form.goldRate24ktInr) || 0,
        diamondRatePerCaratInr: Number(form.diamondRatePerCaratInr) || 0,
        makingChargesPct: Number(form.makingChargesPct) || 0,
        shippingFlatInr: Number(form.shippingFlatInr) || 0,
        profitMarginPct: Number(form.profitMarginPct) || 0,
        profitMarginFlatInr: Number(form.profitMarginFlatInr) || 0,
        usdInrRate: Number(form.usdInrRate) || 0,
        roundToNearestInr: Number(form.roundToNearestInr) || 0,
        roundToNearestUsd: Number(form.roundToNearestUsd) || 0,
        karatPurityPct: {
          '10KT': Number(form.karatPurityPct['10KT']) || 0,
          '14KT': Number(form.karatPurityPct['14KT']) || 0,
          '18KT': Number(form.karatPurityPct['18KT']) || 0,
        },
      };
      const data = await adminFetch('/api/pricing-settings', { method: 'PUT', body });
      setForm({ ...EMPTY, ...data.settings, karatPurityPct: { ...EMPTY.karatPurityPct, ...data.settings.karatPurityPct } });
      setResult({ updated: data.updated, failed: data.failed });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const recompute = async () => {
    setError('');
    setResult(null);
    setRecomputing(true);
    try {
      const data = await adminFetch('/api/pricing-settings/recompute', { method: 'POST' });
      setResult({ updated: data.updated, failed: data.failed });
    } catch (err) {
      setError(err.message);
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div>
      <PageHead title="Pricing" sub="Live gold/diamond rates — saving recalculates every auto-priced product" />
      <ErrorMsg error={error} />
      <form onSubmit={save}>
        <Card>
          <h2 className="font-medium text-sm mb-3">LIVE RATES</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="24kt Gold rate (₹ per gram) *">
              <input type="number" min="0" step="0.01" value={form.goldRate24ktInr} onChange={(e) => set('goldRate24ktInr', e.target.value)} required className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Diamond rate (₹ per carat) *">
              <input type="number" min="0" step="0.01" value={form.diamondRatePerCaratInr} onChange={(e) => set('diamondRatePerCaratInr', e.target.value)} required className={inputCls} style={inputStyle} />
            </Field>
          </div>
          <button type="submit" disabled={saving} className="btn btn--primary w-full disabled:opacity-50">
            {saving ? 'Saving…' : 'Save & Recalculate All Products'}
          </button>
          <button
            type="button"
            onClick={recompute}
            disabled={recomputing || saving}
            className="block underline text-sm text-gray-600 disabled:opacity-50"
            style={{ marginTop: '10px' }}
          >
            {recomputing ? 'Recomputing…' : 'Recompute now (no rate change)'}
          </button>
          <RecomputeResult result={result} />
        </Card>

        <div style={{ height: '16px' }} />
        <details>
          <summary className="text-sm font-medium cursor-pointer" style={{ marginBottom: '12px' }}>
            Advanced — making charges, shipping, margin, FX, rounding
          </summary>
          <div style={{ marginTop: '12px' }}>
            <Card>
              <h2 className="font-medium text-sm mb-3">KARAT PURITY %</h2>
              <p className="text-xs text-gray-400 mb-3">The business's own effective-purity numbers used in the gold cost formula — not the literal karat fraction.</p>
              <div className="grid grid-cols-3 gap-4">
                <Field label="10KT %">
                  <input type="number" min="0" max="100" value={form.karatPurityPct['10KT']} onChange={(e) => setPurity('10KT', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="14KT %">
                  <input type="number" min="0" max="100" value={form.karatPurityPct['14KT']} onChange={(e) => setPurity('14KT', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="18KT %">
                  <input type="number" min="0" max="100" value={form.karatPurityPct['18KT']} onChange={(e) => setPurity('18KT', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
              </div>
            </Card>
            <div style={{ height: '16px' }} />
            <Card>
              <h2 className="font-medium text-sm mb-3">CHARGES & MARGIN</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Making charges (%)" hint="Gross-up (kharcho) — e.g. 6 means the charge is 6% of the final subtotal">
                  <input type="number" min="0" max="94" step="0.01" value={form.makingChargesPct} onChange={(e) => set('makingChargesPct', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Shipping (₹ flat)">
                  <input type="number" min="0" step="1" value={form.shippingFlatInr} onChange={(e) => set('shippingFlatInr', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Profit margin (%)">
                  <input type="number" min="0" step="0.01" value={form.profitMarginPct} onChange={(e) => set('profitMarginPct', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Profit margin (₹ flat)">
                  <input type="number" min="0" step="1" value={form.profitMarginFlatInr} onChange={(e) => set('profitMarginFlatInr', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
              </div>
              <p className="text-xs text-gray-400" style={{ marginTop: '-4px', marginBottom: '10px' }}>
                Selling price = the GREATER of (rounded cost × % margin) and (rounded cost + flat margin).
              </p>
            </Card>
            <div style={{ height: '16px' }} />
            <Card>
              <h2 className="font-medium text-sm mb-3">FX & ROUNDING</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="USD / INR rate">
                  <input type="number" min="0.01" step="0.01" value={form.usdInrRate} onChange={(e) => set('usdInrRate', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Round ₹ to nearest">
                  <input type="number" min="1" step="1" value={form.roundToNearestInr} onChange={(e) => set('roundToNearestInr', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Round $ to nearest">
                  <input type="number" min="1" step="1" value={form.roundToNearestUsd} onChange={(e) => set('roundToNearestUsd', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
              </div>
            </Card>
          </div>
        </details>
      </form>
    </div>
  );
}
