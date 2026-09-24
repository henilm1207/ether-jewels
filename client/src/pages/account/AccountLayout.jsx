import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, LayoutGrid, LogOut, MapPin, Package, ShieldCheck, SlidersHorizontal, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/account', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/preferences', label: 'Preferences', icon: SlidersHorizontal },
  { to: '/account/security', label: 'Security', icon: ShieldCheck },
];

// /account/* shell — sidebar on desktop, swipeable tab strip on mobile.
// The wishlist also works for guests, so it renders standalone (no shell)
// when nobody is signed in; every other section needs a login.
export default function AccountLayout() {
  const { token, user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const guestWishlist = !token && pathname.startsWith('/account/wishlist');

  useEffect(() => {
    if (!loading && !token && !guestWishlist) navigate('/account/login', { replace: true, state: { from: pathname } });
  }, [loading, token, guestWishlist, navigate, pathname]);

  if (guestWishlist) return <Outlet context={{ embedded: false }} />;
  // Cached user renders instantly; only a cold start waits for /me.
  if (loading && !user) return <div className="container py-20 text-sm text-gray-500">Loading…</div>;
  if (!token) return null;

  const linkCls = ({ isActive }) =>
    `flex items-center whitespace-nowrap text-[14px] transition-colors ${isActive ? 'text-[#222] font-medium bg-[#f7f2ef]' : 'text-gray-600 hover:text-[#222]'}`;

  return (
    <section className="py-8 md:py-12">
      <div className="container" style={{ maxWidth: '1180px' }}>
        <div className="md:grid md:grid-cols-[230px_1fr]" style={{ gap: '48px' }}>
          <aside>
            <div className="hidden md:block" style={{ marginBottom: '20px', paddingLeft: '12px' }}>
              <p className="text-subheading" style={{ marginBottom: '4px' }}>Hi, {user?.firstName || 'there'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <nav aria-label="Account" className="flex md:flex-col overflow-x-auto md:overflow-visible border-b md:border-b-0 border-[#ededed] -mx-4 px-4 md:mx-0 md:px-0" style={{ gap: '2px', marginBottom: '24px' }}>
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={linkCls} style={{ gap: '10px', padding: '10px 12px' }}>
                  <Icon size={16} aria-hidden="true" /> {label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex items-center whitespace-nowrap text-[14px] text-gray-600 hover:text-[#222] md:border-t md:border-[#ededed] md:mt-2"
                style={{ gap: '10px', padding: '10px 12px' }}
              >
                <LogOut size={16} aria-hidden="true" /> Sign out
              </button>
            </nav>
          </aside>
          <div className="min-w-0">
            <Outlet context={{ embedded: true }} />
          </div>
        </div>
      </div>
    </section>
  );
}
