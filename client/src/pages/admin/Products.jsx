import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Table, td, Pill, ErrorMsg } from '../../components/admin/ui';

export default function Products() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      const data = await adminFetch(`/api/products/admin/all?${params}`);
      let list = data.items;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        list = list.filter((p) =>
          [p.name, p.slug, p.styleCode, p.category].filter(Boolean).join(' ').toLowerCase().includes(needle)
        );
      }
      setItems(list);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, q]);

  useEffect(() => { load(); }, [load]);

  const archive = async (p) => {
    if (!window.confirm(`Archive "${p.name}"? It will disappear from the store.`)) return;
    try {
      await adminFetch(`/api/products/${p._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <PageHead
        title="Products"
        sub={`${total} total`}
        action={<Link to="/admin/products/new" className="btn btn--primary text-sm">+ New product</Link>}
      />
      <ErrorMsg error={error} />
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search name, slug, SKU…"
          className="bg-white border border-[#d9d9d9] rounded text-sm"
          style={{ padding: '10px 12px', minWidth: '240px' }}
          aria-label="Search products"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <Table head={['Product', 'Category', 'Price', 'Status', 'Stock', '']}>
        {loading ? (
          <tr><td colSpan={6} style={td}>Loading…</td></tr>
        ) : items.length === 0 ? (
          <tr><td colSpan={6} style={td}>No products found.</td></tr>
        ) : items.map((p) => (
          <tr key={p._id}>
            <td style={td}>
              <div className="flex items-center gap-3">
                {p.images?.[0] && <img src={p.images[0]} alt="" width={40} height={40} className="object-cover rounded flex-shrink-0" />}
                <div>
                  <Link to={`/admin/products/${p._id}`} className="font-medium underline">{p.name}</Link>
                  <p className="text-xs text-gray-500">{p.slug}{p.styleCode ? ` · ${p.styleCode}` : ''}</p>
                </div>
              </div>
            </td>
            <td style={td}>{p.category}</td>
            <td style={td}>${Number(p.price).toFixed(2)}</td>
            <td style={td}><Pill value={p.status} /></td>
            <td style={td}>{p.inStock ? (p.stockQty ?? '—') : 'out'}</td>
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
              <Link to={`/admin/products/${p._id}`} className="underline text-sm mr-3">Edit</Link>
              {p.status !== 'archived' && (
                <button onClick={() => archive(p)} className="underline text-sm text-red-700">Archive</button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <div className="flex items-center gap-3 mt-4 text-sm">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="underline disabled:opacity-40">← Prev</button>
        <span>Page {page}</span>
        <button disabled={items.length < 20} onClick={() => setPage((p) => p + 1)} className="underline disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}
