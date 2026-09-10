import { useState } from 'react';
import { Link } from 'react-router-dom';

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
      <div className="container py-10 md:py-12">
        <div
          className="flex flex-wrap gap-y-8"
          style={{ gap: '3rem' }}
        >
          {/* Col 1: Logo (20%) */}
          <div className="w-full md:w-[20%] flex md:justify-center">
            <Link to="/">
              <img src="/images/logo.png" alt="MITVA JEWELS" style={{ maxWidth: '150px' }} />
            </Link>
          </div>

          {/* Col 2: Newsletter (36%) */}
          <div className="w-full md:w-[36%]" style={{ maxWidth: '420px' }}>
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
              <form onSubmit={handleSubscribe} className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-sm bg-white focus:outline-none focus:border-[#222]"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-3 bg-transparent border border-l-0 border-gray-300 hover:bg-gray-100 transition-colors"
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

          {/* Col 3: Contact (16%) */}
          <div className="w-full md:w-[16%]">
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

          {/* Col 4: Shop (10%) */}
          <div className="w-full md:w-[10%]">
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

          {/* Col 5: Company (16%) */}
          <div className="w-full md:w-[16%]">
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
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['Amex', 'Apple Pay', 'Diners Club', 'Discover', 'Google Pay', 'JCB', 'Mastercard', 'Visa'].map((method) => (
              <div
                key={method}
                className="px-2 py-1 bg-white border border-gray-200 text-[10px] text-gray-600"
                style={{ minWidth: '40px', textAlign: 'center' }}
              >
                {method}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
