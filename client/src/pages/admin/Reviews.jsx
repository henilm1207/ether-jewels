import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Table, td, Pill, ErrorMsg } from '../../components/admin/ui';

export default function Reviews() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setList(await adminFetch(`/api/reviews?status=${status}`));
    } catch (e) {
      setError(e.message);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const setStatusOf = async (r, next) => {
    try {
      await adminFetch(`/api/reviews/${r._id}/approve`, { method: 'PATCH', body: { status: next } });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <PageHead title="Reviews" sub="Approval recalculates the product rating" />
      <ErrorMsg error={error} />
      <div className="mb-4 flex gap-2">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`text-sm border rounded px-3 py-1.5 ${status === s ? 'bg-[#222] text-white border-[#222]' : 'border-[#d9d9d9]'}`}>
            {s}
          </button>
        ))}
      </div>
      <Table head={['Review', 'Rating', 'Status', '']}>
        {list.length === 0 ? (
          <tr><td colSpan={4} style={td}>No {status} reviews.</td></tr>
        ) : list.map((r) => (
          <tr key={r._id}>
            <td style={td}>
              <p className="font-medium text-sm">{r.title || '(no title)'} <span className="font-normal text-gray-500">— {r.name}{r.location ? `, ${r.location}` : ''}</span></p>
              <p className="text-sm text-gray-600 mt-1">{r.text}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleString()}</p>
            </td>
            <td style={td}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
            <td style={td}><Pill value={r.status} /></td>
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
              {r.status !== 'approved' && <button onClick={() => setStatusOf(r, 'approved')} className="underline text-sm mr-3 text-green-700">Approve</button>}
              {r.status !== 'rejected' && <button onClick={() => setStatusOf(r, 'rejected')} className="underline text-sm text-red-700">Reject</button>}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
