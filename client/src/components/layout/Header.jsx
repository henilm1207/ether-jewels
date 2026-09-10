import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, ShoppingBag, Menu, X, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';

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

export default function Header({ onCartClick, onMenuClick, onSearchClick, searchOpen }) {
  const { totalItems } = useCart();
  const location = useLocation();
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

  const handleMouseEnter = (label) => {
    clearTimeout(timeoutRef.current);
    setDropdownOpen(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(null), 200);
  };

  const headerTextColor = isTransparent ? 'text-white' : 'text-[#222222]';
  const headerBg = isTransparent ? 'bg-transparent' : 'bg-white';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg} ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between" style={{ height: '63px' }}>
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
              {isTransparent ? (
                <img
                  src="/images/logo-white.png"
                  alt="MITVA JEWELS"
                  style={{ width: '140px', height: 'auto' }}
                />
              ) : (
                <img
                  src="/images/logo.png"
                  alt="MITVA JEWELS"
                  className="hidden md:block"
                  style={{ width: '140px', height: 'auto' }}
                />
              )}
              {/* Mobile logo */}
              {!isTransparent && (
                <img
                  src="/images/logo.png"
                  alt="MITVA JEWELS"
                  className="md:hidden"
                  style={{ width: '100px', height: 'auto' }}
                />
              )}
              {isTransparent && (
                <img
                  src="/images/logo-white.png"
                  alt="MITVA JEWELS"
                  className="md:hidden"
                  style={{ width: '100px', height: 'auto' }}
                />
              )}
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
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
                    className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-[#ededed] min-w-[220px] py-1 z-50 shadow-lg"
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.to}
                        className="block px-5 py-2.5 text-[13px] font-medium text-[#222] hover:bg-[#f7f2ef] transition-colors"
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
                <span className="absolute -top-0 -right-0 bg-[#ecddd4] text-[#222] text-[9px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search Drawer */}
      {searchOpen && (
        <div className="border-t border-[#ededed] bg-white animate-fade-in">
          <div className="container py-4">
            <div className="relative max-w-xl mx-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#ededed] text-sm focus:outline-none focus:border-[#222]"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
