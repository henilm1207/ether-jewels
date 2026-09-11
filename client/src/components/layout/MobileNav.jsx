import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  {
    label: 'Rings',
    to: '/collections/rings',
    children: [
      { label: 'Solitaire Rings', to: '/collections/solitaire-rings' },
      { label: 'Halo Rings', to: '/collections/halo-rings-1' },
      { label: 'Engagement Rings', to: '/collections/engagement-rings' },
      { label: 'Three Stone Rings', to: '/collections/three-stone-rings' },
      { label: 'Bands', to: '/collections/bands' },
    ],
  },
  { label: 'Diamonds', to: '/pages/diamond' },
  { label: 'Contact', to: '/pages/contact' },
  { label: 'About', to: '/pages/about-us' },
];

export default function MobileNav({ isOpen, onClose }) {
  const [expandedMenu, setExpandedMenu] = useState(null);
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100] animate-fade-in"
        style={{ background: 'rgba(68,68,68,0.64)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 h-full w-full max-w-[350px] bg-white z-[101] flex flex-col animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ededed]">
          <Link to="/" onClick={onClose}>
            <img src="/images/logo.png" alt="EtherStar Jewels" className="h-[28px] w-auto" />
          </Link>
          <button onClick={onClose} className="p-1 hover:opacity-70">
            <X size={22} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.label} className="border-b border-[#ededed]">
              {item.children ? (
                <>
                  <button
                    onClick={() =>
                      setExpandedMenu(expandedMenu === item.label ? null : item.label)
                    }
                    className="w-full flex items-center justify-between px-6 py-4 text-[15px] font-medium"
                  >
                    {item.label}
                    {expandedMenu === item.label ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>
                  {expandedMenu === item.label && (
                    <div className="bg-gray-50 pb-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.to}
                          onClick={onClose}
                          className="block px-8 py-3 text-sm text-gray-600 hover:text-[#222] hover:bg-gray-100"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.to}
                  onClick={onClose}
                  className="block px-6 py-4 text-[15px] font-medium"
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#ededed] px-6 py-4">
          {user ? (
            <div className="text-center">
              <p className="text-sm font-medium">Hi, {user.firstName || user.name}</p>
              <button
                onClick={() => { logout(); onClose(); }}
                className="mt-2 w-full py-3 border border-[#222] text-center text-[13px] font-medium uppercase tracking-wider hover:bg-[#222] hover:text-white transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/account/login"
              onClick={onClose}
              className="block w-full py-3 border border-[#222] text-center text-[13px] font-medium uppercase tracking-wider hover:bg-[#222] hover:text-white transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
