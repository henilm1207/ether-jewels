import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../components/admin/api';
import { clearMenuCache } from '../../lib/categoryTree';
import { PageHead, Table, td, ErrorMsg, Card, Field, inputCls, inputStyle } from '../../components/admin/ui';

const EMPTY = { key: '', name: '', parent: 'Collection', description: '', image: '', shape: '', aggregateKeys: '', sortOrder: 0, active: true };

export default function Categories() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      setList(await adminFetch('/api/categories/admin/all'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startNew = () => { setEditing('new'); setForm(EMPTY); setError(''); };
  const startEdit = (c) => {
    setEditing(c.key);
    setForm({ ...EMPTY, ...c, shape: c.shape || '', image: c.image || '', description: c.description || '', aggregateKeys: (c.aggregateKeys || []).join(', ') });
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      aggregateKeys: String(form.aggregateKeys || '').split(',').map((k) => k.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean),
    };
    try {
      if (editing === 'new') {
        await adminFetch('/api/categories', { method: 'POST', body: { ...payload, key: payload.key.trim().toLowerCase().replace(/\s+/g, '-') } });
      } else {
        await adminFetch(`/api/categories/${editing}`, { method: 'PUT', body: payload });
      }
      setEditing(null);
      clearMenuCache(); // storefront + mobile menus rebuild on next open
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageHead title="Categories" sub={`${list.length} total (aliases + shapes included)`} action={<button onClick={startNew} className="btn btn--primary text-sm">+ New category</button>} />
      <ErrorMsg error={error} />

      {editing && (
        <Card>
          <h2 className="font-medium text-sm mb-3">{editing === 'new' ? 'NEW CATEGORY' : `EDIT ${editing}`}</h2>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Field label="Key * (slug)"><input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required disabled={editing !== 'new'} className={inputCls} style={inputStyle} /></Field>
            <Field label="Name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputCls} style={inputStyle} /></Field>
            <Field label="Parent"><input value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })} className={inputCls} style={inputStyle} /></Field>
            <Field label="Shape (optional)"><input value={form.shape} onChange={(e) => setForm({ ...form, shape: e.target.value })} placeholder="Round…" className={inputCls} style={inputStyle} /></Field>
            <Field label="Sort order"><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={inputCls} style={inputStyle} /></Field>
            <label className="flex items-center gap-2 text-sm" style={{ paddingBottom: '22px' }}><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
            <div className="sm:col-span-3">
              <Field label="Description"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} style={inputStyle} /></Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="Aggregate keys (variants only, comma separated)" hint="e.g. solitaire-rings, halo-rings, bands — makes this category list those shelves. Leave blank for leaf categories."><input value={form.aggregateKeys} onChange={(e) => setForm({ ...form, aggregateKeys: e.target.value })} placeholder="solitaire-rings, halo-rings, …" className={inputCls} style={inputStyle} /></Field>
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="btn btn--primary text-sm">Save</button>
              <button type="button" onClick={() => setEditing(null)} className="underline text-sm">Cancel</button>
            </div>
          </form>
        </Card>
      )}
      {editing && <div style={{ height: '16px' }} />}

      <Table head={['Key', 'Name', 'Parent', 'Shape', 'Aggregates', 'Active', '']}>
        {list.map((c) => (
          <tr key={c.key}>
            <td style={td} className="font-mono text-xs">{c.key}{c.aliasOf && <span className="text-gray-400"> → {c.aliasOf}</span>}</td>
            <td style={td}>{c.name}</td>
            <td style={td}>{c.parent}</td>
            <td style={td}>{c.shape || '—'}</td>
            <td style={td} className="font-mono text-xs">{(c.aggregateKeys || []).join(', ') || '—'}</td>
            <td style={td}>{c.active ? 'yes' : 'no'}</td>
            <td style={td}><button onClick={() => startEdit(c)} className="underline text-sm">Edit</button></td>
          </tr>
        ))}
      </Table>
      {!editing && <p className="text-xs text-gray-400 mt-3">Tip: product categories must match a non-alias key with no shape (e.g. earrings, solitaire-rings). Shape collections map to the shape filter.</p>}
    </div>
  );
}
