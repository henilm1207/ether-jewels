import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Settings2 } from 'lucide-react';
import { apiUrl } from '../config';
import { useAuth } from '../context/AuthContext';

const OPEN_STATUSES = ['pending', 'confirmed', 'making', 'shipped'];

const statusStyle = (s) => {
  switch (s) {
    case 'delivered':
      return { background: '#e7f4e7', color: '#1d6b1d' };
    case 'cancelled':
      return { background: '#f6e3e3', color: '#8f1d1d' };
    case 'shipped':
    case 'making':
      return { background: '#e8effc', color: '#1d3f8f' };
    default:
      return { background: '#f7f2ef', color: '#563c22' };
  }
};

// /account — orders with tracking + profile settings. Settings freeze
// (server-enforced) while any order is unreceived.
export default function Profile() {
  const { token, user, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !token) navigate('/account/login', { replace: true });
  }, [loading, token, navigate]);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/orders/mine'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => []);
        if (live) setOrders(Array.isArray(data) ? data : []);
      } catch {
        if (live) setOrders([]);
      } finally {
        if (live) setOrdersLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [token]);

  if (loading) return <div className="container py-20 text-sm text-gray-500">Loading…</div>;
  if (!token) return null;

  const openOrder = orders.find((o) => OPEN_STATUSES.includes(o.status));
  const locked = !!openOrder;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setMsg('Profile saved ✓');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container container-narrow" style={{ maxWidth: '880px' }}>
        <div className="text-center" style={{ paddingBottom: '40px' }}>
          <p className="text-subheading" style={{ marginBottom: '12px' }}>
            Hi, {user?.firstName || 'there'}
          </p>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
            My account
          </h1>
        </div>

        {/* Orders */}
        <h2 className="font-medium text-sm flex items-center gap-2" style={{ marginBottom: '16px' }}>
          <Package size={16} /> MY ORDERS ({orders.length})
        </h2>
        {ordersLoading ? (
          <div className="animate-pulse bg-[#f1ece8]" style={{ height: '120px' }} aria-hidden="true" />
        ) : orders.length === 0 ? (
          <div className="text-center border border-[#ededed]" style={{ padding: '32px 16px', marginBottom: '40px' }}>
            <p className="text-gray-500 text-[15px]" style={{ marginBottom: '16px' }}>No orders yet.</p>
            <Link to="/collections/rings" className="btn btn--primary">Start shopping</Link>
          </div>
        ) : (
          <div className="grid" style={{ gap: '12px', marginBottom: '40px' }}>
            {orders.map((o) => (
              <div key={o._id} className="border border-[#ededed] bg-white" style={{ padding: '16px' }}>
                <div className="flex flex-wrap items-center justify-between" style={{ gap: '8px', marginBottom: '8px' }}>
                  <span className="font-mono text-xs">#{String(o._id).slice(-8).toUpperCase()}</span>
                  <span className="text-[13px] font-medium rounded-full" style={{ padding: '3px 12px', ...statusStyle(o.status) }}>
                    {o.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600" style={{ marginBottom: '4px' }}>
                  {(o.items || []).map((it) => `${it.name} × ${it.qty}`).join(' · ')}
                </p>
                <p className="text-[15px] font-medium" style={{ marginBottom: '4px' }}>
                  ${Number(o.pricing?.total || 0).toFixed(2)} USD
                  <span className="text-xs font-normal text-gray-500"> · {o.payment?.method}{o.payment?.status === 'paid' ? ' (paid)' : ' (payment pending)'}</span>
                </p>
                {o.trackingId ? (
                  <p className="text-sm bg-[#f7f2ef] rounded" style={{ padding: '8px 12px', marginTop: '8px' }}>
                    <span className="font-medium">Tracking{o.carrier ? ` (${o.carrier})` : ''}:</span>{' '}
                    <span className="font-mono">{o.trackingId}</span>
                  </p>
                ) : (
                  ['shipped', 'making'].includes(o.status) && (
                    <p className="text-xs text-gray-500" style={{ marginTop: '8px' }}>Tracking will appear here once dispatched.</p>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        <h2 className="font-medium text-sm flex items-center gap-2" style={{ marginBottom: '16px' }}>
          <Settings2 size={16} /> PROFILE SETTINGS
        </h2>
        {locked && (
          <p role="note" className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded" style={{ padding: '10px 12px', marginBottom: '16px' }}>
            Locked — order #{String(openOrder._id).slice(-8).toUpperCase()} is {openOrder.status}.
            Name, email and phone can be edited again after delivery.
          </p>
        )}
        {msg && <p role="status" className="text-sm text-green-700" style={{ marginBottom: '12px' }}>{msg}</p>}
        {error && <p role="alert" className="text-sm text-red-700" style={{ marginBottom: '12px' }}>{error}</p>}
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" aria-label="First name" disabled={locked || saving} className="form-control disabled:opacity-50" autoComplete="given-name" />
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" aria-label="Last name" disabled={locked || saving} className="form-control disabled:opacity-50" autoComplete="family-name" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" aria-label="Email" type="email" disabled={locked || saving} className="form-control disabled:opacity-50" autoComplete="email" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" aria-label="Phone" type="tel" disabled={locked || saving} className="form-control disabled:opacity-50" autoComplete="tel" />
          <div className="sm:col-span-2">
            <button type="submit" disabled={locked || saving} className="btn btn--primary w-full disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
