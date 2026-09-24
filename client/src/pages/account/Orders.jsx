import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { accountFetch, fmtDate, orderNo, SectionTitle, StatusPill } from './shared';

export function useMyOrders() {
  const { token } = useAuth();
  const [state, setState] = useState({ orders: [], loading: true });
  useEffect(() => {
    if (!token) return;
    let live = true;
    accountFetch(token, '/api/orders/mine')
      .then((data) => live && setState({ orders: Array.isArray(data) ? data : [], loading: false }))
      .catch(() => live && setState({ orders: [], loading: false }));
    return () => {
      live = false;
    };
  }, [token]);
  return state;
}

export function OrderCard({ o }) {
  const first = (o.items || [])[0];
  const more = (o.items || []).length - 1;
  return (
    <Link to={`/account/orders/${o._id}`} className="flex items-center border border-[#ededed] bg-white hover:border-[#222] transition-colors" style={{ padding: '14px', gap: '14px' }}>
      {first?.image ? (
        <img src={first.image} alt="" className="object-cover bg-[#f7f2ef] shrink-0" style={{ width: '64px', height: '64px' }} />
      ) : (
        <div className="bg-[#f7f2ef] shrink-0" style={{ width: '64px', height: '64px' }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center" style={{ gap: '8px', marginBottom: '4px' }}>
          <span className="font-mono text-xs">#{orderNo(o)}</span>
          <StatusPill status={o.status} />
        </div>
        <p className="text-sm truncate">
          {first ? `${first.name}${more > 0 ? ` + ${more} more` : ''}` : '—'}
        </p>
        <p className="text-xs text-gray-500">
          {fmtDate(o.createdAt)} · ${Number(o.pricing?.total || 0).toFixed(2)} USD
          {o.payment?.status !== 'paid' && o.status !== 'cancelled' ? ' · payment pending' : ''}
        </p>
      </div>
      <ChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
    </Link>
  );
}

// /account/orders
export default function Orders() {
  const { orders, loading } = useMyOrders();
  return (
    <>
      <SectionTitle title="My orders" subtitle={loading ? null : `${orders.length} order${orders.length === 1 ? '' : 's'}`} />
      {loading ? (
        <div className="animate-pulse bg-[#f1ece8]" style={{ height: '160px' }} aria-hidden="true" />
      ) : orders.length === 0 ? (
        <div className="text-center border border-[#ededed]" style={{ padding: '40px 16px' }}>
          <p className="text-gray-500 text-[15px]" style={{ marginBottom: '16px' }}>No orders yet.</p>
          <Link to="/collections/rings" className="btn btn--primary">Start shopping</Link>
        </div>
      ) : (
        <div className="grid" style={{ gap: '12px' }}>
          {orders.map((o) => (
            <OrderCard key={o._id} o={o} />
          ))}
        </div>
      )}
    </>
  );
}
