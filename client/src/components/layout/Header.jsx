import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../config';

import { getMenuTree } from '../../lib/categoryTree';

const navItems = [
  {
    label: 'Jewellery',
    to: '/collections',
    dynamic: true, // children (variant groups) load live from DB categories
  },
  { label: 'Diamonds', to: '/pages/diamond' },
  { label: 'Contact', to: '/pages/contact' },
  { label: 'About', to: '/pages/about-us' },
];

// Announcement bar slot — live has none; set VITE_ANNOUNCEMENT_TEXT to show.
const ANNOUNCEMENT_TEXT = import.meta.env.VITE_ANNOUNCEMENT_TEXT || '';

export default function Header({ onCartClick, onMenuClick, onSearchClick, searchOpen }) {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    setSearchValue('');
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [accountOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && searchOpen) onSearchClick?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [searchOpen, onSearchClick]);

  const handleMouseEnter = (label) => {
    clearTimeout(timeoutRef.current);
    setDropdownOpen(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(null), 200);
  };

  const [suggestions, setSuggestions] = useState([]);
  const [menuGroups, setMenuGroups] = useState(null); // null = loading, [] = empty DB

  useEffect(() => {
    let live = true;
    getMenuTree()
      .then((tree) => { if (live) setMenuGroups(tree); })
      .catch(() => { if (live) setMenuGroups([]); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const q = searchValue.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/products?search=${encodeURIComponent(q)}&limit=4`));
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (live) setSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (live) setSuggestions([]);
      }
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [searchValue]);

  const submitSearch = (e) => {
    e?.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    onSearchClick?.();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const headerTextColor = isTransparent ? 'text-white' : 'text-[#222222]';
  const logoSrc = isTransparent ? '/images/logo-white.png' : '/images/logo.png';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          isTransparent ? 'bg-transparent' : 'bg-white'
        }`}
        style={isTransparent ? undefined : { borderBottom: isHome ? 'none' : '1px solid #ededed' }}
      >
        {ANNOUNCEMENT_TEXT ? (
          <div className="bg-[#222] text-white text-center text-[11px] tracking-[1.5px] uppercase py-2 px-4">
            {ANNOUNCEMENT_TEXT}
          </div>
        ) : null}
        <div className="container">
          {/* Live: 13px 0 desktop / 12px ≤1280 / mobile min-height 60px */}
          <div
            className="flex items-center justify-between header-bar"
            style={{ padding: '13px 0' }}
          >
            {/* Left: Mobile Menu + Logo */}
            <div className="flex items-center gap-4">
              <button onClick={onMenuClick} className="lg:hidden p-1 -ml-1" aria-label="Menu">
                <Menu size={22} className={headerTextColor} />
              </button>
              <Link to="/" className="flex-shrink-0" style={{ margin: 0, padding: '5px 0' }}>
                <img src={logoSrc} alt="EtherStar Jewels" className="hidden md:block" style={{ width: '140px', height: 'auto' }} />
                <img src={logoSrc} alt="EtherStar Jewels" className="md:hidden" style={{ width: '100px', height: 'auto' }} />
              </Link>
            </div>

            {/* Center: Desktop Navigation — 15px/500/uppercase, underline hover */}
            <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2" style={{ margin: '-10px 0' }}>
              {navItems.map((base) => {
                const item = base.dynamic ? { ...base, children: true, groups: menuGroups } : base;
                const hasMenu = base.dynamic || item.children;
                return (
                <div
                  key={item.label}
                  className="relative nav-item"
                  onMouseEnter={() => hasMenu && handleMouseEnter(item.label)}
                  onMouseLeave={hasMenu ? handleMouseLeave : undefined}
                >
                  <Link
                    to={item.to || '#'}
                    className={`nav-link inline-flex items-center uppercase ${headerTextColor}`}
                    style={{ lineHeight: '40px', padding: '10px 24px', fontSize: '15px', fontWeight: 500 }}
                  >
                    {item.label}
                    {hasMenu && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginInlineStart: '8px' }}>
                        <path d="M1 3.5L4.5 7L8 3.5" />
                      </svg>
                    )}
                  </Link>

                  {hasMenu && dropdownOpen === item.label && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 bg-white z-50"
                      style={{ minWidth: '230px', maxWidth: 'min(1060px, calc(100vw - 40px))', padding: '18px 21px', boxShadow: '0 12px 20px rgba(0,0,0,0.07)', border: '1px solid #ededed' }}
                      onMouseEnter={() => handleMouseEnter(item.label)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {base.dynamic ? (
                        menuGroups === null ? (
                          <span className="block text-[#222]" style={{ padding: '8px 0', lineHeight: '24px', fontSize: '15px' }}>Loading…</span>
                        ) : menuGroups.length === 0 ? (
                          <span className="block text-[#222]" style={{ padding: '8px 0', lineHeight: '24px', fontSize: '15px', opacity: 0.6 }}>New collections coming soon</span>
                        ) : (
                          <div className="mega-menu-columns" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                            {menuGroups.map((g) => (
                              <div key={g.label} style={{ flex: '1 1 140px', minWidth: '140px' }}>
                                <Link
                                  to={g.to}
                                  className="block uppercase hover:opacity-70 transition-opacity"
                                  style={{ padding: '8px 0 4px', lineHeight: '24px', fontSize: '13px', fontWeight: 500, letterSpacing: '1px', whiteSpace: 'nowrap' }}
                                  onClick={() => setDropdownOpen(null)}
                                >
                                  {g.label}
                                </Link>
                                {(g.children || []).map((child) => (
                                  <Link
                                    key={child.label}
                                    to={child.to}
                                    className="block text-[#222] hover:opacity-70 transition-opacity"
                                    style={{ padding: '6px 0', lineHeight: '24px', fontSize: '15px', whiteSpace: 'nowrap' }}
                                    onClick={() => setDropdownOpen(null)}
                                  >
                                    {child.label}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        item.children.map((child) => (
                          <Link
                            key={child.label}
                            to={child.to}
                            className="block text-[#222] hover:opacity-70 transition-opacity"
                            style={{ padding: '8px 0', lineHeight: '24px', fontSize: '15px' }}
                            onClick={() => setDropdownOpen(null)}
                          >
                            {child.label}
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </nav>

            {/* Right: Icons — live site-header__addons */}
            <div className="flex items-center header-addons">
              <button onClick={onSearchClick} className="hover:opacity-70 transition-opacity flex items-center justify-center" style={{ width: '44px', height: '44px' }} aria-label="Search">
                <Search size={24} className={headerTextColor} />
              </button>
              {user ? (
                <div ref={accountRef} className="relative hidden md:flex items-center justify-center" style={{ width: '44px', height: '44px' }}>
                  <button
                    onClick={() => setAccountOpen((v) => !v)}
                    className="hover:opacity-70 transition-opacity flex items-center justify-center w-full h-full"
                    aria-label={`Account — ${user.firstName || user.name}`}
                    aria-expanded={accountOpen}
                    title={user.firstName || user.name}
                  >
                    <span className="flex items-center justify-center rounded-full bg-[#222] text-white text-sm font-medium" style={{ width: '28px', height: '28px' }}>
                      {(user.firstName || user.name || 'A').charAt(0).toUpperCase()}
                    </span>
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 top-full bg-white border border-[#ededed] shadow-lg z-50" style={{ minWidth: '200px' }}>
                      <p className="text-sm font-medium truncate" style={{ padding: '12px 16px 4px' }}>
                        Hi, {user.firstName || user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate" style={{ padding: '0 16px 12px' }}>{user.email}</p>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setAccountOpen(false)}
                          className="block w-full text-left text-sm font-medium underline hover:opacity-70"
                          style={{ padding: '12px 16px', borderTop: '1px solid #ededed' }}
                        >
                          Admin panel
                        </Link>
                      )}
                      <button
                        onClick={() => { logout(); setAccountOpen(false); navigate('/'); }}
                        className="block w-full text-left text-sm underline hover:opacity-70"
                        style={{ padding: '12px 16px', borderTop: '1px solid #ededed' }}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/account/login" className="hover:opacity-70 transition-opacity hidden md:flex items-center justify-center" style={{ width: '44px', height: '44px' }} aria-label="Account">
                  <User size={24} strokeWidth={1.5} className={headerTextColor} />
                </Link>
              )}
              <button onClick={onCartClick} className="hover:opacity-70 transition-opacity relative flex items-center justify-center" style={{ width: '44px', height: '44px' }} aria-label="Cart">
                <ShoppingBag size={24} strokeWidth={1.5} className={headerTextColor} />
                {totalItems > 0 && (
                  <span
                    className="absolute flex items-center justify-center rounded-full"
                    style={{ height: '18px', minWidth: '18px', fontSize: '12px', lineHeight: '16px', padding: '0 3px', left: '14px', bottom: '10px', background: '#ecddd4', color: '#222' }}
                  >
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        <style>{`
          .nav-item .nav-link { position: relative; }
          .nav-item .nav-link::after {
            content: ''; position: absolute; left: 24px; right: 24px; bottom: 5px;
            height: 1px; background: currentColor; width: 0; transition: width .3s ease;
          }
          .nav-item:hover .nav-link::after { width: calc(100% - 48px); }
          @media (max-width: 1279.98px) { .header-bar { padding: 12px 0 !important; } }
          @media (max-width: 640.02px) { .header-bar { padding: 6px 0 !important; min-height: 60px; } }
          .header-addons { margin: 0; }
          @media (min-width: 1280px) { .header-addons { margin: 0 -12px; } }
        `}</style>
      </header>

      {/* Search drawer — live 460px right drawer */}
      {searchOpen && (
        <>
          <div className="fixed inset-0 z-[100] animate-fade-in" style={{ background: 'rgba(68,68,68,0.64)' }} onClick={onSearchClick} />
          <aside className="fixed top-0 right-0 h-full w-full max-w-[460px] bg-white z-[101] flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between" style={{ padding: '24px 30px 12px' }}>
              <h2 className="text-[13px] font-medium tracking-[1px] uppercase">Search</h2>
              <button onClick={onSearchClick} aria-label="Close search" className="p-1 hover:opacity-70">
                <X size={22} />
              </button>
            </div>
            <div style={{ padding: '24px 30px' }} className="overflow-y-auto">
              <form onSubmit={submitSearch} className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                />
              </form>
              <p className="text-center text-[12px] text-gray-400 mt-2 tracking-wide">
                Search &amp; press Enter
              </p>
              {searchValue.trim() ? (
                suggestions.length > 0 ? (
                  <div className="mt-4 divide-y divide-[#f0f0f0] border border-[#ededed]">
                    {suggestions.map((p) => (
                      <Link
                        key={p.slug}
                        to={`/products/${p.slug}`}
                        onClick={onSearchClick}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#f7f2ef] transition-colors"
                      >
                        <span className="w-10 h-10 bg-[#f7f2ef] overflow-hidden flex-shrink-0">
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-medium truncate">{p.name}</span>
                          <span className="block text-[13px] text-gray-500">${p.price.toFixed(2)} USD</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[15px] text-gray-500 mt-4">
                    No results for &ldquo;{searchValue.trim()}&rdquo;. Try &ldquo;solitaire&rdquo; or &ldquo;halo&rdquo;.
                  </p>
                )
              ) : null}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
