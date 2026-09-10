import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { products } from '../../data/products';

const navItems = [
  {
    label: 'Rings',
    children: [
      { label: 'Solitaire Rings', to: '/collections/solitaire-rings' },
      { label: 'Halo Rings', to: '/collections/halo-rings' },
      { label: 'Engagement Rings', to: '/collections/engagement-rings' },
      { label: 'Three Stone Rings', to: '/collections/three-stone-rings' },
      { label: 'Bands', to: '/collections/bands' },
    ],
  },
  { label: 'Diamonds', to: '/pages/diamond' },
  { label: 'Contact', to: '/pages/contact' },
  { label: 'About', to: '/pages/about-us' },
];

// Announcement bar slot — Prestige expects it; hidden until enabled.
// Set VITE_ANNOUNCEMENT_TEXT to show, e.g. "Complimentary insured shipping over $1,000".
const ANNOUNCEMENT_TEXT = import.meta.env.VITE_ANNOUNCEMENT_TEXT || '';

export default function Header({ onCartClick, onMenuClick, onSearchClick, searchOpen }) {
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !scrolled;
  // Live inner-page header is taller (84px) than the transparent home header (63px)
  const headerHeight = isTransparent ? 63 : 84;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  // Close search on route change
  useEffect(() => {
    setSearchValue('');
  }, [location.pathname]);

  const handleMouseEnter = (label) => {
    clearTimeout(timeoutRef.current);
    setDropdownOpen(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(null), 200);
  };

  const suggestions = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 4);
  }, [searchValue]);

  const submitSearch = (e) => {
    e?.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    if (suggestions.length > 0) {
      navigate(`/products/${suggestions[0].slug}`);
    }
    onSearchClick?.();
  };

  const headerTextColor = isTransparent ? 'text-white' : 'text-[#222222]';
  const headerBg = isTransparent ? 'bg-transparent' : 'bg-white';
  const logoSrc = isTransparent ? '/images/logo-white.png' : '/images/logo.png';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg} ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      {ANNOUNCEMENT_TEXT ? (
        <div className="bg-[#222] text-white text-center text-[11px] tracking-[1.5px] uppercase py-2 px-4">
          {ANNOUNCEMENT_TEXT}
        </div>
      ) : null}
      <div className="container">
        <div className="flex items-center justify-between transition-all duration-300" style={{ height: `${headerHeight}px` }}>
          {/* Left: Mobile Menu + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-1 -ml-1"
              aria-label="Menu"
            >
              <Menu size={22} className={headerTextColor} />
            </button>

            <Link to="/" className="flex-shrink-0">
              {/* Desktop logo 150px / mobile 135px */}
              <img
                src={logoSrc}
                alt="MITVA JEWELS"
                className="hidden md:block"
                style={{ width: '150px', height: 'auto' }}
              />
              <img
                src={logoSrc}
                alt="MITVA JEWELS"
                className="md:hidden"
                style={{ width: '135px', height: 'auto' }}
              />
            </Link>
          </div>

          {/* Center: Desktop Navigation — 32px gap, 13px / 1px tracking / 500 */}
          <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && handleMouseEnter(item.label)}
                onMouseLeave={item.children ? handleMouseLeave : undefined}
              >
                {item.to ? (
                  <Link
                    to={item.to}
                    className={`text-[13px] font-medium tracking-[1px] uppercase hover:opacity-70 transition-opacity inline-flex items-center gap-1 ${headerTextColor}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    className={`text-[13px] font-medium tracking-[1px] uppercase hover:opacity-70 transition-opacity inline-flex items-center gap-1 ${headerTextColor}`}
                  >
                    {item.label}
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1" className="ml-0.5">
                      <path d="M1 3.5L4.5 7L8 3.5" />
                    </svg>
                  </button>
                )}

                {item.children && dropdownOpen === item.label && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-[#ededed] min-w-[260px] py-3 z-50 shadow-lg"
                    style={{ marginTop: '12px' }}
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.to}
                        className="block px-6 py-3 text-[13px] font-medium text-[#222] hover:bg-[#f7f2ef] transition-colors"
                        onClick={() => setDropdownOpen(null)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right: Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onSearchClick}
              className="p-2 hover:opacity-70 transition-opacity"
              aria-label="Search"
            >
              {searchOpen ? (
                <X size={20} className={headerTextColor} />
              ) : (
                <Search size={20} className={headerTextColor} />
              )}
            </button>

            <button className="p-2 hover:opacity-70 transition-opacity hidden md:block" aria-label="Account">
              <User size={20} className={headerTextColor} />
            </button>

            <button
              onClick={onCartClick}
              className="p-2 hover:opacity-70 transition-opacity relative"
              aria-label="Cart"
            >
              <ShoppingBag size={20} className={headerTextColor} />
              {totalItems > 0 && (
                <span
                  className="absolute top-0 right-0 bg-[#EEE0D5] text-[#222] flex items-center justify-center rounded-full"
                  style={{ width: '16px', height: '16px', fontSize: '10px', fontWeight: 900 }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search Drawer — full-width with hint + suggestions */}
      {searchOpen && (
        <div className="border-t border-[#ededed] bg-white animate-fade-in">
          <div className="container py-5">
            <form onSubmit={submitSearch} className="relative max-w-xl mx-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#ededed] text-sm focus:outline-none focus:border-[#222]"
              />
            </form>
            <p className="text-center text-[12px] text-gray-400 mt-2 tracking-wide">
              Search &amp; press Enter
            </p>
            {searchValue.trim() ? (
              suggestions.length > 0 ? (
                <div className="max-w-xl mx-auto mt-4 divide-y divide-[#f0f0f0] border border-[#ededed]">
                  {suggestions.map((p) => (
                    <Link
                      key={p.slug}
                      to={`/products/${p.slug}`}
                      onClick={() => onSearchClick?.()}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#f7f2ef] transition-colors"
                    >
                      <span className="w-10 h-10 bg-[#f7f2ef] overflow-hidden flex-shrink-0">
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium truncate">{p.name}</span>
                        <span className="block text-[12px] text-gray-500">${p.price.toFixed(2)} USD</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[13px] text-gray-500 mt-4">
                  No results for &ldquo;{searchValue.trim()}&rdquo;. Try &ldquo;solitaire&rdquo; or &ldquo;halo&rdquo;.
                </p>
              )
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
