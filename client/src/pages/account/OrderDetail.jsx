import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatAddressLines } from '../../lib/address';
import { accountFetch, fmtDate, orderNo, SectionTitle, StatusPill } from './shared';

const STEPS = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'making', label: 'Crafting' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

function Timeline({ status }) {
  if (status === 'cancelled') {
    return <p className="text-sm text-red-700 bg-[#f6e3e3]" style={{ padding: '10px 12px' }}>This order was cancelled.</p>;
  }
  const at = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <li key={s.key} className="flex-1 flex flex-col items-center text-center relative" aria-current={i === at ? 'step' : undefined}>
            {i > 0 && (
              <span className="absolute" style={{ top: '11px', right: '50%', width: '100%', height: '2px', background: done ? '#222' : '#ededed' }} aria-hidden="true" />
            )}
            <span
              className="relative z-10 flex items-center justify-center rounded-full"
              style={{ width: '24px', height: '24px', background: done ? '#222' : '#fff', border: `2px solid ${done ? '#222' : '#ededed'}`, color: '#fff' }}
            >
              {done && <Check size={13} strokeWidth={3} />}
            </span>
            <span className={`text-[11px] sm:text-xs ${done ? 'text-[#222] font-medium' : 'text-gray-400'}`} style={{ marginTop: '6px' }}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// /account/orders/:id — shows the order's frozen shipping address copy,
// never the (editable) saved address it may have come from.
export default function OrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    accountFetch(token, `/api/orders/mine/${id}`)
      .then((o) => live && setOrder(o))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [token, id]);

  const back = (
    <Link to="/account/orders" className="inline-flex items-center text-sm text-gray-600 hover:text-[#222]" style={{ gap: '6px', marginBottom: '16px' }}>
      <ArrowLeft size={15} /> All orders
    </Link>
  );
  if (error) return <>{back}<p className="text-sm text-red-700">{error}</p></>;
  if (!order) return <>{back}<div className="animate-pulse bg-[#f1ece8]" style={{ height: '240px' }} aria-hidden="true" /></>;

  const a = order.shippingAddress || {};
  const p = order.pricing || {};
  return (
    <>
      {back}
      <SectionTitle title={`Order #${orderNo(order)}`} subtitle={`Placed ${fmtDate(order.createdAt)}`} action={<StatusPill status={order.status} />} />

      <div className="border border-[#ededed]" style={{ padding: '20px 12px', marginBottom: '20px' }}>
        <Timeline status={order.status} />
        {order.trackingId ? (
          <p className="text-sm bg-[#f7f2ef]" style={{ padding: '8px 12px', marginTop: '16px' }}>
            <span className="font-medium">Tracking{order.carrier ? ` (${order.carrier})` : ''}:</span> <span className="font-mono">{order.trackingId}</span>
          </p>
        ) : (
          ['confirmed', 'making'].includes(order.status) && (
            <p className="text-xs text-gray-500 text-center" style={{ marginTop: '14px' }}>Tracking will appear here once dispatched.</p>
          )
        )}
      </div>

      <div className="grid" style={{ gap: '10px', marginBottom: '20px' }}>
        {(order.items || []).map((it, i) => (
          <div key={i} className="flex items-center border border-[#ededed]" style={{ padding: '12px', gap: '12px' }}>
            {it.image ? <img src={it.image} alt="" className="object-cover bg-[#f7f2ef]" style={{ width: '56px', height: '56px' }} /> : null}
            <div className="flex-1 min-w-0">
              <p className="text-sm">{it.name}</p>
              <p className="text-xs text-gray-500">
                {[it.metal?.karat, it.metal?.color, it.size ? `Size ${it.size}` : ''].filter(Boolean).join(' · ')} · Qty {it.qty}
              </p>
            </div>
            <p className="text-sm">${Number(it.lineTotal || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2" style={{ gap: '16px' }}>
        <div className="border border-[#ededed]" style={{ padding: '16px' }}>
          <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '8px' }}>Shipping to</p>
          <p className="text-sm font-medium">{a.fullName}</p>
          {formatAddressLines(a).map((l) => (
            <p key={l} className="text-sm text-gray-600">{l}</p>
          ))}
          {a.phone && <p className="text-sm text-gray-600">{a.phone}</p>}
        </div>
        <div className="border border-[#ededed] text-sm" style={{ padding: '16px' }}>
          <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '8px' }}>Payment</p>
          <div className="flex justify-between"><span>Subtotal</span><span>${Number(p.subtotal || 0).toFixed(2)}</span></div>
          {p.discount > 0 && <div className="flex justify-between text-green-700"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>−${Number(p.discount).toFixed(2)}</span></div>}
          <div className="flex justify-between"><span>Shipping</span><span>{p.shipping ? `$${Number(p.shipping).toFixed(2)}` : 'Free'}</span></div>
          <div className="flex justify-between font-medium border-t border-[#ededed]" style={{ marginTop: '8px', paddingTop: '8px' }}>
            <span>Total</span><span>${Number(p.total || 0).toFixed(2)} USD</span>
          </div>
          <p className="text-xs text-gray-500" style={{ marginTop: '8px' }}>
            {order.payment?.method === 'razorpay' ? 'Paid online' : order.payment?.method === 'skydo' ? 'International bank transfer' : order.payment?.method} ·{' '}
            {order.payment?.status === 'paid' ? 'Paid' : order.payment?.status === 'awaiting_transfer' ? 'Awaiting transfer' : order.payment?.status}
          </p>
        </div>
      </div>
    </>
  );
}
