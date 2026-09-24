import { Link } from 'react-router-dom';
import { Heart, MapPin, Package, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatAddressLines } from '../../lib/address';
import { OrderCard, useMyOrders } from './Orders';
import useAddresses from '../../hooks/useAddresses';
import { OPEN_STATUSES, SectionTitle } from './shared';

const QUICK = [
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/preferences', label: 'Ring size & preferences', icon: SlidersHorizontal },
];

// /account — at-a-glance: latest order, default address, shortcuts.
export default function Overview() {
  const { user } = useAuth();
  const { orders, loading } = useMyOrders();
  const { addresses } = useAddresses();
  const latest = orders[0];
  const active = orders.filter((o) => OPEN_STATUSES.includes(o.status)).length;
  const def = addresses.find((a) => a.isDefault) || addresses[0];
  const missing = [!user?.dob && 'birthday', !user?.ringSize && 'ring size'].filter(Boolean);

  return (
    <>
      <SectionTitle title={`Welcome back, ${user?.firstName || ''}`} subtitle={active ? `${active} order${active === 1 ? '' : 's'} in progress` : 'Manage your orders, addresses and preferences.'} />

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '10px', marginBottom: '28px' }}>
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="border border-[#ededed] hover:border-[#222] transition-colors flex flex-col items-start text-sm" style={{ padding: '16px', gap: '10px' }}>
            <Icon size={18} aria-hidden="true" /> {label}
          </Link>
        ))}
      </div>

      {missing.length > 0 && (
        <p className="text-sm bg-[#f7f2ef]" style={{ padding: '12px 14px', marginBottom: '28px' }}>
          Add your {missing.join(' and ')} for birthday surprises and faster checkout.{' '}
          <Link to={!user?.dob ? '/account/profile' : '/account/preferences'} className="underline">Add now</Link>
        </p>
      )}

      <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '10px' }}>Latest order</p>
      {loading ? (
        <div className="animate-pulse bg-[#f1ece8]" style={{ height: '92px', marginBottom: '28px' }} aria-hidden="true" />
      ) : latest ? (
        <div style={{ marginBottom: '28px' }}><OrderCard o={latest} /></div>
      ) : (
        <p className="text-sm text-gray-500" style={{ marginBottom: '28px' }}>
          No orders yet. <Link to="/collections/rings" className="underline">Start shopping</Link>
        </p>
      )}

      <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '10px' }}>Default address</p>
      {def ? (
        <div className="border border-[#ededed] text-sm" style={{ padding: '14px' }}>
          <p className="font-medium">{def.fullName}</p>
          {formatAddressLines(def).map((l) => <p key={l} className="text-gray-600">{l}</p>)}
          <Link to="/account/addresses" className="underline text-xs" style={{ display: 'inline-block', marginTop: '8px' }}>Manage addresses</Link>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No saved address. <Link to="/account/addresses" className="underline">Add one</Link> for one-tap checkout.
        </p>
      )}
    </>
  );
}
