import { useState } from 'react';
import { Link } from 'react-router-dom';

const paymentMethods = [
  { name: 'Visa', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="Visa"><rect width="38" height="24" rx="3" fill="#fff" stroke="#e2e2e2" /><text x="19" y="16" textAnchor="middle" fontSize="9" fontWeight="800" fontStyle="italic" fill="#1A1F71">VISA</text></svg>) },
  { name: 'Mastercard', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="Mastercard"><rect width="38" height="24" rx="3" fill="#fff" stroke="#e2e2e2" /><circle cx="15" cy="12" r="6" fill="#EB001B" opacity="0.85" /><circle cx="23" cy="12" r="6" fill="#F79E1B" opacity="0.85" /></svg>) },
  { name: 'Amex', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="Amex"><rect width="38" height="24" rx="3" fill="#2E77BC" /><text x="19" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">AMEX</text></svg>) },
  { name: 'Apple Pay', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="Apple Pay"><rect width="38" height="24" rx="3" fill="#000" /><text x="19" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff"> Pay</text></svg>) },
  { name: 'Google Pay', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="Google Pay"><rect width="38" height="24" rx="3" fill="#fff" stroke="#e2e2e2" /><text x="19" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#5F6368">G Pay</text></svg>) },
  { name: 'Discover', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="Discover"><rect width="38" height="24" rx="3" fill="#fff" stroke="#e2e2e2" /><text x="19" y="16" textAnchor="middle" fontSize="7" fontWeight="800" fill="#F48120">DISCOVER</text></svg>) },
  { name: 'JCB', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="JCB"><rect width="38" height="24" rx="3" fill="#fff" stroke="#e2e2e2" /><text x="19" y="16" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0B4EA2">JCB</text></svg>) },
  { name: 'Diners Club', svg: (<svg width="38" height="24" viewBox="0 0 38 24" aria-label="Diners Club"><rect width="38" height="24" rx="3" fill="#fff" stroke="#e2e2e2" /><circle cx="19" cy="12" r="7" fill="none" stroke="#0079BE" strokeWidth="1.5" /><text x="19" y="14.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#0079BE">DC</text></svg>) },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubscribed(true);
        setEmail('');
      }
    } catch {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#ece7e3]">
      <div className="container py-10 md:py-14">
        {/* 12-col grid — no wrap on 1280px */}
        <div className="grid grid-cols-12 gap-8 md:gap-10">
          {/* Logo */}
          <div className="col-span-12 md:col-span-2">
            <Link to="/">
              <img src="/images/logo.png" alt="MITVA JEWELS" style={{ maxWidth: '150px' }} />
            </Link>
          </div>

          {/* Newsletter — underline style like live */}
          <div className="col-span-12 md:col-span-4">
            <h6
              className="mb-3"
              style={{
                fontSize: '16px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              Join the Mitva Club
            </h6>
            <p className="text-sm text-gray-600 mb-3">
              Subscribe for store updates and discounts.
            </p>
            {subscribed ? (
              <p className="text-sm text-green-700">Thank you for subscribing!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center border-b border-[#222] bg-transparent">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 py-3 bg-transparent text-sm focus:outline-none placeholder:text-gray-500"
                  required
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="p-2 hover:translate-x-1 transition-transform"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            )}
            <p className="text-[11px] text-gray-500 mt-3">
              By subscribing you agree to the{' '}
              <a href="#" className="underline">Terms of Use</a> &{' '}
              <a href="#" className="underline">Privacy Policy</a>.
            </p>
          </div>

          {/* Contact */}
          <div className="col-span-6 md:col-span-2">
            <h6
              className="mb-4"
              style={{
                fontSize: '16px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              Contact
            </h6>
            <ul className="space-y-2">
              <li><Link to="/search" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Search</Link></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Returns & Refunds</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Shipping & Delivery</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-[#222] transition-colors">FAQS</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-[#222] transition-colors">My account</a></li>
            </ul>
          </div>

          {/* Shop */}
          <div className="col-span-6 md:col-span-2">
            <h6
              className="mb-4"
              style={{
                fontSize: '16px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              Shop
            </h6>
            <ul className="space-y-2">
              <li><Link to="/collections/solitaire-rings" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Rings</Link></li>
              <li><Link to="/collections/earrings" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Earrings</Link></li>
              <li><Link to="/collections/bracelets" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Bracelets</Link></li>
              <li><Link to="/collections/necklaces" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Necklaces</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="col-span-6 md:col-span-2">
            <h6
              className="mb-4"
              style={{
                fontSize: '16px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              Company
            </h6>
            <ul className="space-y-2">
              <li><Link to="/collections/solitaire-rings" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Rings</Link></li>
              <li><Link to="/pages/diamond" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Diamonds</Link></li>
              <li><Link to="/pages/contact" className="text-sm text-gray-600 hover:text-[#222] transition-colors">Contact</Link></li>
              <li><Link to="/pages/about-us" className="text-sm text-gray-600 hover:text-[#222] transition-colors">About</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-gray-300 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">© 2026, MITVA JEWELS L.L.C.</p>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {paymentMethods.map((method) => (
              <span key={method.name} title={method.name} className="inline-flex">
                {method.svg}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
