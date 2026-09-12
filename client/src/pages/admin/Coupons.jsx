import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Table, td, Pill, ErrorMsg, Card, Field, inputCls, inputStyle } from '../../components/admin/ui';

export default function Coupons() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', type: 'pct', value: '', minOrder: '', maxUses: '', expiresAt: '' });

  const load = useCallback(async () => {
    try {
      setList(await adminFetch('/api/coupons'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await adminFetch('/api/coupons', {
        method: 'POST',
        body: {
          code: form.code,
          type: form.type,
          value: Number(form.value),
          minOrder: form.minOrder === '' ? 0 : Number(form.minOrder),
          maxUses: form.maxUses === '' ? null : Number(form.maxUses),
          expiresAt: form.expiresAt || null,
        },
      });
      setForm({ code: '', type: 'pct', value: '', minOrder: '', maxUses: '', expiresAt: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = async (c) => {
    try {
      const updated = await adminFetch(`/api/coupons/${c._id}`, { method: 'PATCH', body: { active: !c.active } });
      setList((l) => l.map((x) => (x._id === c._id ? updated : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <PageHead title="Coupons" sub={`${list.length} total`} />
      <ErrorMsg error={error} />
      <Card>
        <h2 className="font-medium text-sm mb-3">NEW COUPON</h2>
        <form onSubmit={create} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <Field label="Code"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="WELCOME10" className={inputCls} style={inputStyle} /></Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls} style={inputStyle}>
              <option value="pct">% off</option>
              <option value="flat">$ off</option>
            </select>
          </Field>
          <Field label={form.type === 'pct' ? 'Value 1-90' : 'Value $'}><input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required className={inputCls} style={inputStyle} /></Field>
          <Field label="Min order $"><input type="number" min="0" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <Field label="Max uses"><input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="∞" className={inputCls} style={inputStyle} /></Field>
          <button type="submit" className="btn btn--primary text-sm" style={{ height: '42px' }}>Create</button>
        </form>
      </Card>
      <div style={{ height: '16px' }} />
      <Table head={['Code', 'Deal', 'Min', 'Uses', 'Expires', 'Status', '']}>
        {list.map((c) => (
          <tr key={c._id}>
            <td style={td} className="font-mono font-medium">{c.code}</td>
            <td style={td}>{c.type === 'pct' ? `${c.value}%` : `$${c.value}`}</td>
            <td style={td}>${c.minOrder || 0}</td>
            <td style={td}>{c.usedCount}{c.maxUses != null ? `/${c.maxUses}` : ''}</td>
            <td style={td}>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
            <td style={td}><Pill value={c.active ? 'approved' : 'cancelled'} map={{ approved: 'on', cancelled: 'off' }} />{!c.active && c.autoOff ? <span className="text-xs text-gray-500"> · auto</span> : null}</td>
            <td style={td}><button onClick={() => toggle(c)} className="underline text-sm">{c.active ? 'Disable' : 'Enable'}</button></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
