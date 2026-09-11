import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Table, td, Pill, ErrorMsg } from '../../components/admin/ui';

export default function Inquiries() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setList(await adminFetch(`/api/inquiries${status ? `?status=${status}` : ''}`));
    } catch (e) {
      setError(e.message);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const mark = async (inq, next) => {
    try {
      const updated = await adminFetch(`/api/inquiries/${inq._id}`, { method: 'PATCH', body: { status: next } });
      setList((l) => l.map((x) => (x._id === inq._id ? updated : x)));
      if (open && open._id === inq._id) setOpen(updated);
    } catch (e) {
      setError(e.message);
    }
  };

  const sel = open && list.find((i) => i._id === open._id);

  return (
    <div>
      <PageHead title="Inquiries" sub="Contact + custom-design messages" />
      <ErrorMsg error={error} />
      <div className="mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Filter by status">
          <option value="">All</option>
          <option value="new">New</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <Table head={['From', 'Type', 'Message', 'Status', '']}>
        {list.length === 0 ? (
          <tr><td colSpan={5} style={td}>No inquiries.</td></tr>
        ) : list.map((i) => (
          <tr key={i._id}>
            <td style={td}>
              <p className="text-sm font-medium">{i.name || '—'}</p>
              <p className="text-xs text-gray-500">{i.email}{i.phone ? ` · ${i.phone}` : ''}</p>
              <p className="text-xs text-gray-400">{new Date(i.createdAt).toLocaleString()}</p>
            </td>
            <td style={td}>{i.type}</td>
            <td style={{ ...td, maxWidth: '320px' }}><p className="truncate">{i.message}</p></td>
            <td style={td}><Pill value={i.status} /></td>
            <td style={td}><button onClick={() => setOpen(i)} className="underline text-sm">Open</button></td>
          </tr>
        ))}
      </Table>

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: '16px' }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(null)} />
          <div className="relative bg-white rounded w-full" style={{ maxWidth: '560px', padding: '20px' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading">Message</h2>
              <button onClick={() => setOpen(null)} className="underline text-sm">Close</button>
            </div>
            <p className="text-sm mb-1"><strong>{sel.name}</strong> · {sel.email}{sel.phone ? ` · ${sel.phone}` : ''}</p>
            <p className="text-xs text-gray-500 mb-3">{sel.type} · {new Date(sel.createdAt).toLocaleString()}</p>
            <p className="text-sm whitespace-pre-wrap bg-[#fafafa] border border-[#eee] rounded" style={{ padding: '12px' }}>{sel.message}</p>
            <div className="flex gap-2 mt-4">
              {['new', 'replied', 'closed'].filter((s) => s !== sel.status).map((s) => (
                <button key={s} onClick={() => mark(sel, s)} className="text-sm border border-[#222] rounded px-3 py-1.5 hover:bg-[#222] hover:text-white transition-colors">
                  Mark {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
