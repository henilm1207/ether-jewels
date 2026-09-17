import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Table, td, ErrorMsg } from '../../components/admin/ui';

export default function Customers() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q.trim()) params.set('q', q.trim());
      const data = await adminFetch(`/api/users/admin/all?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHead title="Customers" sub={`${total} total`} />
      <ErrorMsg error={error} />
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search name, email, phone…"
          className="bg-white border border-[#d9d9d9] rounded text-sm"
          style={{ padding: '10px 12px', minWidth: '240px' }}
          aria-label="Search customers"
        />
      </div>
      <Table head={['Customer', 'Joined', 'Orders', 'Lifetime value', 'Last order', '']}>
        {loading ? (
          <tr><td colSpan={6} style={td}>Loading…</td></tr>
        ) : items.length === 0 ? (
          <tr><td colSpan={6} style={td}>No customers found.</td></tr>
        ) : items.map((c) => (
          <tr key={c._id}>
            <td style={td}>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
            </td>
            <td style={td}>{new Date(c.createdAt).toLocaleDateString()}</td>
            <td style={td}>{c.orderCount}</td>
            <td style={td}>${Number(c.lifetimeValue).toFixed(2)}</td>
            <td style={td}>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</td>
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
              <Link to={`/admin/orders?email=${encodeURIComponent(c.email)}`} className="underline text-sm">View orders</Link>
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
