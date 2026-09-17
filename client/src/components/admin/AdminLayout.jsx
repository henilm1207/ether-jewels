import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/inquiries', label: 'Inquiries' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/pricing', label: 'Pricing' },
];

// Back-office chrome — deliberately plain, separate from the storefront theme.
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-[#fafafa]">
      <aside className="w-56 flex-shrink-0 bg-[#1A1A1A] text-white hidden md:flex md:flex-col">
        <Link to="/admin" className="font-heading text-sm tracking-widest" style={{ padding: '20px 20px 8px' }}>
          ETHER ADMIN
        </Link>
        <p className="text-xs text-gray-400" style={{ padding: '0 20px 20px' }}>
          {user?.firstName || user?.name} · {user?.role}
        </p>
        <nav className="flex-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block text-sm transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'}`
              }
              style={{ padding: '12px 20px' }}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '20px' }}>
          <Link to="/" target="_blank" rel="noreferrer" className="block text-xs text-gray-300 underline mb-3">View store</Link>
          <button
            onClick={() => { logout(); navigate('/account/login'); }}
            className="w-full text-xs uppercase tracking-wider border border-gray-500 py-2 hover:border-white transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden bg-[#1A1A1A] text-white flex items-center justify-between" style={{ padding: '12px 16px' }}>
          <span className="font-heading text-xs tracking-widest">ETHER ADMIN</span>
          <button onClick={() => { logout(); navigate('/account/login'); }} className="text-xs underline">Log out</button>
        </header>
        <nav className="md:hidden flex overflow-x-auto bg-[#1A1A1A] text-gray-300 border-t border-white/10">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `flex-shrink-0 text-xs ${isActive ? 'text-white underline' : ''}`} style={{ padding: '10px 14px' }}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1" style={{ padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
