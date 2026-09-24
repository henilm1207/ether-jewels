import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Table, td, Pill, ErrorMsg } from '../../components/admin/ui';

const STATUSES = ['pending', 'confirmed', 'making', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'awaiting_transfer'];
const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['making', 'cancelled'], making: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
// Orders at/above this total get a visual flag for extra care (signature on
// delivery, insured shipping) — a plain constant, not a setting, for now.
const HIGH_VALUE_THRESHOLD = 2000;

// Shipment tracking editor — admin sets the id + carrier; the customer sees
// it on /account. Locked once delivered/cancelled (server enforces too).
function TrackingForm({ order, onSaved, onError }) {
  const [trackingId, setTrackingId] = useState(order.trackingId || '');
  const [carrier, setCarrier] = useState(order.carrier || '');
  const [saving, setSaving] = useState(false);
  const locked = ['delivered', 'cancelled'].includes(order.status);
  const dirty =
    (trackingId.trim() || '') !== (order.trackingId || '') ||
    (carrier.trim() || '') !== (order.carrier || '');
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tracking (visible to customer)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Tracking ID"
          disabled={locked || saving}
          className="bg-white border border-[#d9d9d9] rounded text-sm disabled:opacity-50"
          style={{ padding: '10px 12px' }}
          aria-label="Tracking ID"
        />
        <input
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="Carrier (optional)"
          disabled={locked || saving}
          className="bg-white border border-[#d9d9d9] rounded text-sm disabled:opacity-50"
          style={{ padding: '10px 12px' }}
          aria-label="Carrier"
        />
      </div>
      <button
        type="button"
        disabled={locked || saving || !dirty}
        onClick={async () => {
          setSaving(true);
          try {
            const updated = await adminFetch(`/api/orders/${order._id}/tracking`, {
              method: 'PATCH',
              body: { trackingId: trackingId.trim(), carrier: carrier.trim() },
            });
            onSaved(updated);
          } catch (e) {
            onError(e.message);
          } finally {
            setSaving(false);
          }
        }}
        className="underline text-sm mt-2 disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Save tracking'}
      </button>
    </div>
  );
}

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  // Pre-filled from ?email= when arriving via a Customers-page "view orders"
  // link. `email` is what's actually sent to the server; `emailDraft` is the
  // input's live value — committed on Enter/blur so typing doesn't fire a
  // request per keystroke.
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [emailDraft, setEmailDraft] = useState(searchParams.get('email') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (email.trim()) params.set('email', email.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const data = await adminFetch(`/api/orders?${params}`);
      setOrders(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    }
  }, [page, status, paymentStatus, email, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const move = async (o, next) => {
    try {
      const updated = await adminFetch(`/api/orders/${o._id}/status`, { method: 'PATCH', body: { status: next } });
      setOrders((list) => list.map((x) => (x._id === o._id ? updated : x)));
      setOpen(updated);
    } catch (e) {
      setError(e.message);
    }
  };

  const sel = open && orders.find((o) => o._id === open._id);

  return (
    <div>
      <PageHead title="Orders" sub={`${total} total`} />
      <ErrorMsg error={error} />
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Filter by payment status">
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          onBlur={() => { setEmail(emailDraft); setPage(1); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { setEmail(emailDraft); setPage(1); } }}
          placeholder="Customer email…"
          className="bg-white border border-[#d9d9d9] rounded text-sm"
          style={{ padding: '10px 12px', minWidth: '200px' }}
          aria-label="Filter by customer email"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          From
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '9px 10px' }} aria-label="From date" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          To
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '9px 10px' }} aria-label="To date" />
        </label>
      </div>
      <Table head={['Order', 'Customer', 'Total', 'Payment', 'Status', '']}>
        {orders.length === 0 ? (
          <tr><td colSpan={6} style={td}>No orders.</td></tr>
        ) : orders.map((o) => (
          <tr key={o._id}>
            <td style={td}>
              <p className="font-mono text-xs">{o._id.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()} · {o.items.reduce((n, i) => n + i.qty, 0)} items</p>
            </td>
            <td style={td}>
              <p className="text-sm">{o.shippingAddress?.fullName || o.contact?.name || '—'}</p>
              <p className="text-xs text-gray-500">{o.contact?.email}</p>
            </td>
            <td style={td}>
              ${Number(o.pricing?.total || 0).toFixed(2)}
              {Number(o.pricing?.total || 0) >= HIGH_VALUE_THRESHOLD && (
                <span title={`$${HIGH_VALUE_THRESHOLD}+ order — consider signature/insured shipping`} className="inline-block text-xs font-medium rounded px-1.5 py-0.5 ml-2 bg-purple-100 text-purple-800">high-value</span>
              )}
              {o.couponCode && <p className="text-xs text-gray-500">{o.couponCode} (−${Number(o.pricing?.discount || 0).toFixed(2)})</p>}
            </td>
            <td style={td}><Pill value={o.payment?.status} /> <span className="text-xs text-gray-500">{o.payment?.method}</span></td>
            <td style={td}><Pill value={o.status} /></td>
            <td style={td}><button onClick={() => setOpen(o)} className="underline text-sm">Open</button></td>
          </tr>
        ))}
      </Table>
      <div className="flex items-center gap-3 mt-4 text-sm">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="underline disabled:opacity-40">← Prev</button>
        <span>Page {page}</span>
        <button disabled={orders.length < 20} onClick={() => setPage((p) => p + 1)} className="underline disabled:opacity-40">Next →</button>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: '16px' }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(null)} />
          <div className="relative bg-white rounded w-full overflow-y-auto" style={{ maxWidth: '640px', maxHeight: '90vh', padding: '20px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading">Order {sel._id.slice(-8).toUpperCase()}</h2>
              <button onClick={() => setOpen(null)} className="underline text-sm">Close</button>
            </div>
            {sel.items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-[#f0f0f0]" style={{ padding: '8px 0' }}>
                <span>{it.name} {it.size && `(size ${it.size})`} × {it.qty} <span className="text-gray-500">· {it.metal?.karat} {it.metal?.color}</span></span>
                <span>${Number(it.lineTotal).toFixed(2)}</span>
              </div>
            ))}
            <div className="text-sm mt-3 space-y-1">
              <p>Subtotal: ${Number(sel.pricing?.subtotal || 0).toFixed(2)}</p>
              <p>Discount: −${Number(sel.pricing?.discount || 0).toFixed(2)}</p>
              <p className="font-medium">Total: ${Number(sel.pricing?.total || 0).toFixed(2)} USD</p>
              {sel.payment?.method === 'razorpay' && sel.payment?.chargedAmount != null && (
                <p className="text-gray-600">Charged: {Number(sel.payment.chargedAmount).toFixed(2)} {sel.payment.chargedCurrency} via Razorpay</p>
              )}
              {sel.payment?.method === 'skydo' && sel.payment?.wireReference && (
                <p className="text-gray-600">Wire reference: <span className="font-mono">{sel.payment.wireReference}</span> ({sel.payment.wireCurrency})</p>
              )}
              <p className="text-gray-600">{sel.shippingAddress?.fullName}, {sel.shippingAddress?.line1}, {sel.shippingAddress?.city} {sel.shippingAddress?.zip}, {sel.shippingAddress?.country} · {sel.shippingAddress?.phone}</p>
              {sel.orderNote && <p className="text-gray-600">Note: {sel.orderNote}</p>}
            </div>
            {sel.payment?.method === 'skydo' && sel.payment?.status === 'awaiting_transfer' && (
              <button
                onClick={async () => {
                  try {
                    const { order: updated } = await adminFetch(`/api/payments/skydo/${sel._id}/confirm`, { method: 'PATCH' });
                    setOrders((list) => list.map((x) => (x._id === updated._id ? updated : x)));
                    setOpen(updated);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
                className="text-sm border border-[#222] rounded px-3 py-1.5 hover:bg-[#222] hover:text-white transition-colors mt-3"
              >
                Mark payment received
              </button>
            )}
            <TrackingForm
              key={sel._id}
              order={sel}
              onSaved={(updated) => {
                setOrders((list) => list.map((x) => (x._id === updated._id ? updated : x)));
                setOpen(updated);
              }}
              onError={setError}
            />
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Move status (now: {sel.status})</p>
              {sel.status === 'pending' && sel.payment?.status !== 'paid' && (
                <p role="note" className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded" style={{ padding: '8px 10px', marginBottom: '8px' }}>
                  Awaiting advance payment — confirmation is blocked until paid. Cancellation stays available.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {(NEXT[sel.status] || []).map((n) => (
                  <button key={n} onClick={() => move(sel, n)} className="text-sm border border-[#222] rounded px-3 py-1.5 hover:bg-[#222] hover:text-white transition-colors">
                    → {n}
                  </button>
                ))}
                {(NEXT[sel.status] || []).length === 0 && <span className="text-sm text-gray-500">Terminal state.</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
