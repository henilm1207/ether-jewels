import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMenuTree } from '../../lib/categoryTree';

const menuItems = [
  { label: 'Jewellery', to: '/collections', dynamic: true },
  { label: 'Diamonds', to: '/pages/diamond' },
  { label: 'Contact', to: '/pages/contact' },
  { label: 'About', to: '/pages/about-us' },
];

export default function MobileNav({ isOpen, onClose }) {
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [menuGroups, setMenuGroups] = useState(null); // null = loading, [] = empty DB
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    getMenuTree()
      .then((tree) => { if (live) setMenuGroups(tree); })
      .catch(() => { if (live) setMenuGroups([]); });
    return () => { live = false; };
  }, [isOpen]);

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
          {menuItems.map((item) => {
            const groups = item.dynamic ? menuGroups : null;
            const hasKids = item.dynamic || item.children;
            if (!hasKids) {
              return (
                <div key={item.label} className="border-b border-[#ededed]">
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className="block px-6 py-4 text-[15px] font-medium"
                  >
                    {item.label}
                  </Link>
                </div>
              );
            }
            return (
            <div key={item.label} className="border-b border-[#ededed]">
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
                      {item.dynamic ? (
                        groups === null ? (
                          <p className="px-8 py-3 text-sm text-gray-500">Loading…</p>
                        ) : groups.length === 0 ? (
                          <>
                            <p className="px-8 py-3 text-sm text-gray-500">New collections coming soon</p>
                            <Link
                              to="/collections"
                              onClick={onClose}
                              className="block px-8 py-3 text-sm text-gray-600 hover:text-[#222] hover:bg-gray-100 underline"
                            >
                              View all collections
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/collections"
                              onClick={onClose}
                              className="block px-8 py-3 text-sm font-medium underline"
                            >
                              View all collections
                            </Link>
                            {groups.map((g) => (
                              <div key={g.label}>
                                <button
                                  onClick={() => setExpandedGroup(expandedGroup === g.label ? null : g.label)}
                                  className="w-full flex items-center justify-between px-8 py-3 text-sm font-medium"
                                >
                                  {g.label}
                                  {expandedGroup === g.label ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {expandedGroup === g.label && (
                                  <div className="pb-1">
                                    <Link
                                      to={g.to}
                                      onClick={onClose}
                                      className="block px-10 py-2.5 text-sm text-gray-600 hover:text-[#222] hover:bg-gray-100 underline"
                                    >
                                      Shop all {g.label}
                                    </Link>
                                    {(g.children || []).map((child) => (
                                      <Link
                                        key={child.label}
                                        to={child.to}
                                        onClick={onClose}
                                        className="block px-10 py-2.5 text-sm text-gray-600 hover:text-[#222] hover:bg-gray-100"
                                      >
                                        {child.label}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        )
                      ) : (
                        item.children.map((child) => (
                          <Link
                            key={child.label}
                            to={child.to}
                            onClick={onClose}
                            className="block px-8 py-3 text-sm text-gray-600 hover:text-[#222] hover:bg-gray-100"
                          >
                            {child.label}
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </>
            </div>
            );
          })}
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
