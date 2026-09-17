import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Table, td, Pill, ErrorMsg, Card, Field, inputCls, inputStyle, RowIconButton } from '../../components/admin/ui';

const EMPTY_FORM = { code: '', type: 'pct', value: '', minOrder: '', maxUses: '', expiresAt: '' };

export default function Coupons() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null); // coupon _id, or null for the create form
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      setList(await adminFetch('/api/coupons'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (c) => {
    setEditing(c._id);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrder: String(c.minOrder || 0),
      maxUses: c.maxUses == null ? '' : String(c.maxUses),
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '',
    });
    setError('');
  };
  const cancelEdit = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      type: form.type,
      value: Number(form.value),
      minOrder: form.minOrder === '' ? 0 : Number(form.minOrder),
      maxUses: form.maxUses === '' ? null : Number(form.maxUses),
      expiresAt: form.expiresAt || null,
    };
    try {
      if (editing) {
        await adminFetch(`/api/coupons/${editing}`, { method: 'PATCH', body: payload });
      } else {
        await adminFetch('/api/coupons', { method: 'POST', body: { ...payload, code: form.code } });
      }
      cancelEdit();
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

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon "${c.code}"? This can't be undone.`)) return;
    setError('');
    setDeleting(c._id);
    try {
      await adminFetch(`/api/coupons/${c._id}`, { method: 'DELETE' });
      if (editing === c._id) cancelEdit();
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <PageHead title="Coupons" sub={`${list.length} total`} />
      <ErrorMsg error={error} />
      <Card>
        <h2 className="font-medium text-sm mb-3">{editing ? `EDIT ${form.code}` : 'NEW COUPON'}</h2>
        <form onSubmit={save} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <Field label="Code"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required disabled={!!editing} placeholder="WELCOME10" className={inputCls} style={inputStyle} /></Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls} style={inputStyle}>
              <option value="pct">% off</option>
              <option value="flat">$ off</option>
            </select>
          </Field>
          <Field label={form.type === 'pct' ? 'Value 1-90' : 'Value $'}><input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required className={inputCls} style={inputStyle} /></Field>
          <Field label="Min order $"><input type="number" min="0" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <Field label="Max uses"><input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="∞" className={inputCls} style={inputStyle} /></Field>
          <Field label="Expires"><input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <div className="col-span-2 sm:col-span-6 flex gap-3">
            <button type="submit" className="btn btn--primary text-sm">{editing ? 'Save changes' : 'Create'}</button>
            {editing && <button type="button" onClick={cancelEdit} className="underline text-sm">Cancel</button>}
          </div>
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
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle(c)} className="underline text-sm mr-2">{c.active ? 'Disable' : 'Enable'}</button>
                <RowIconButton icon={Pencil} label="Edit" onClick={() => startEdit(c)} />
                <RowIconButton
                  icon={Trash2}
                  label={deleting === c._id ? 'Deleting…' : 'Delete'}
                  tone="danger"
                  disabled={deleting === c._id}
                  onClick={() => remove(c)}
                />
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
