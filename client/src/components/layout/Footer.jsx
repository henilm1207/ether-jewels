import { useState } from 'react';
import { Link } from 'react-router-dom';

/* Shopify payment badges in live order — 40px wide */
const paymentMethods = [
  {
    name: 'American Express',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="American Express">
        <rect width="40" height="25" rx="3" fill="#2E77BC" />
        <text x="20" y="16.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">AMEX</text>
      </svg>
    ),
  },
  {
    name: 'Apple Pay',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="Apple Pay">
        <rect width="40" height="25" rx="3" fill="#000" />
        <path fill="#fff" d="M15.36 13.76c0-1.54 1.26-2.28 1.32-2.32-.72-1.05-1.84-1.19-2.23-1.21-.95-.1-1.86.56-2.34.56-.48 0-1.23-.55-2.02-.53-1.04.01-2 .6-2.53 1.53-1.08 1.87-.27 4.64.78 6.16.51.74 1.13 1.58 1.93 1.54.78-.03 1.07-.5 2.01-.5s1.2.5 2.03.49c.84-.02 1.37-.76 1.88-1.5.6-.87.84-1.71.86-1.75-.02-.01-1.64-.63-1.69-2.47zM13.98 8.84c.43-.52.72-1.24.64-1.95-.62.02-1.36.41-1.8.92-.4.46-.74 1.19-.65 1.89.7.05 1.4-.35 1.81-.86z" />
        <text x="30.5" y="16.5" textAnchor="middle" fontSize="8" fontWeight="600" fill="#fff" fontFamily="Arial, sans-serif">Pay</text>
      </svg>
    ),
  },
  {
    name: 'Diners Club',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="Diners Club">
        <rect width="40" height="25" rx="3" fill="#fff" stroke="#e2e2e2" />
        <clipPath id="dc-clip"><circle cx="14" cy="12.5" r="7" /></clipPath>
        <g clipPath="url(#dc-clip)">
          <rect x="7" y="5.5" width="7" height="14" fill="#0079BE" />
          <rect x="14" y="5.5" width="7" height="14" fill="#D8D8D8" />
        </g>
        <circle cx="14" cy="12.5" r="7" fill="none" stroke="#0079BE" strokeWidth="1" />
        <text x="29" y="15.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#0079BE" fontFamily="Arial, sans-serif">DINERS</text>
      </svg>
    ),
  },
  {
    name: 'Discover',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="Discover">
        <rect width="40" height="25" rx="3" fill="#fff" stroke="#e2e2e2" />
        <text x="17" y="12" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#222" fontFamily="Arial, sans-serif">DISCOVER</text>
        <path d="M4 16.5c4 1.6 9 2.4 14 2.2 5-.2 10-1.4 13-3.2l-2.5 4.5c-4 1-8.5 1.4-12.5 1-4.5-.4-8.5-1.5-12-3z" fill="#F48120" />
        <circle cx="29" cy="14.5" r="3" fill="#F48120" />
      </svg>
    ),
  },
  {
    name: 'Google Pay',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="Google Pay">
        <rect width="40" height="25" rx="3" fill="#fff" stroke="#e2e2e2" />
        <text x="11" y="17" textAnchor="middle" fontSize="11" fontWeight="800" fill="#4285F4" fontFamily="Arial, sans-serif">G</text>
        <text x="27" y="16.5" textAnchor="middle" fontSize="8" fontWeight="600" fill="#5F6368" fontFamily="Arial, sans-serif">Pay</text>
      </svg>
    ),
  },
  {
    name: 'JCB',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="JCB">
        <rect width="40" height="25" rx="3" fill="#fff" stroke="#e2e2e2" />
        <rect x="6" y="6" width="8" height="13" rx="1.5" fill="#0B4EA2" />
        <rect x="16" y="6" width="8" height="13" rx="1.5" fill="#CC0000" />
        <rect x="26" y="6" width="8" height="13" rx="1.5" fill="#009A44" />
        <text x="10" y="15.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">J</text>
        <text x="20" y="15.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">C</text>
        <text x="30" y="15.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">B</text>
      </svg>
    ),
  },
  {
    name: 'Mastercard',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="Mastercard">
        <rect width="40" height="25" rx="3" fill="#fff" stroke="#e2e2e2" />
        <circle cx="16.5" cy="12.5" r="6" fill="#EB001B" />
        <circle cx="23.5" cy="12.5" r="6" fill="#F79E1B" fillOpacity="0.85" />
      </svg>
    ),
  },
  {
    name: 'Visa',
    svg: (
      <svg width="40" height="25" viewBox="0 0 40 25" role="img" aria-label="Visa">
        <rect width="40" height="25" rx="3" fill="#fff" stroke="#e2e2e2" />
        <text x="20" y="17" textAnchor="middle" fontSize="10" fontWeight="800" fontStyle="italic" fill="#1A1F71" fontFamily="Arial, sans-serif">VISA</text>
      </svg>
    ),
  },
];

const blockTitleStyle = {
  fontSize: '16px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  marginBottom: '24px',
};

const linkClass = 'text-sm hover:text-[#222] transition-colors';
const linkStyle = { color: 'rgba(34,34,34,.8)', lineHeight: '3rem' };

/* Link column — static heading on desktop, collapsible details on mobile */
function LinkBlock({ title, links }) {
  return (
    <div>
      {/* Desktop — heading is display-only (live: pointer-events:none) */}
      <div className="hidden lg:block pointer-events-none">
        <h6 className="mb-4" style={blockTitleStyle}>{title}</h6>
        <ul>
          {links.map((link) => (
            <li key={link.label} style={{ lineHeight: '3rem' }}>
              <Link to={link.to} className={linkClass} style={linkStyle}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </div>
      {/* Mobile — collapsible */}
      <details className="lg:hidden group border-b border-[#d9d9d9]">
        <summary className="flex items-center justify-between py-4 cursor-pointer list-none" style={{ fontSize: '16px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '2px' }}>
          {title}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-open:rotate-180" aria-hidden="true">
            <path d="M2 4l4 4 4-4" />
          </svg>
        </summary>
        <div className="pb-8">
          <ul>
            {links.map((link) => (
              <li key={link.label} style={{ lineHeight: '3rem' }}>
                <Link to={link.to} className={linkClass} style={linkStyle}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

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
      {/* site-footer__top — live: 8rem 0 1.5rem (mobile 3.2rem top) */}
      <div className="container pt-[3.2rem] pb-6 lg:pt-[8rem] lg:pb-[1.5rem]">
        {/* f-column flex percentages — newsletter last in DOM, right on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-start">
          {/* Logo — 20% */}
          <div className="lg:order-1 lg:basis-[20%] mb-8 lg:mb-0 lg:pr-6">
            <Link to="/">
              <img src="/images/logo.png" alt="MITVA JEWELS" style={{ maxWidth: '150px' }} />
            </Link>
          </div>

          {/* Newsletter — 36%, order 9 on desktop (right) */}
          <div className="order-2 lg:order-9 lg:basis-[36%] mb-8 lg:mb-0 lg:pl-6">
            <div className="lg:max-w-[420px] lg:ml-auto">
              <h6 className="mb-3" style={blockTitleStyle}>
                Join the Mitva Club
              </h6>
              <p className="text-sm mb-4" style={{ color: 'rgba(34,34,34,.8)' }}>
                Subscribe for store updates and discounts.
              </p>
              {subscribed ? (
                <p className="text-sm text-green-700">Thank you for subscribing!</p>
              ) : (
                <form onSubmit={handleSubscribe} className="relative">
                  <label htmlFor="footer-newsletter-email" className="sr-only">Email</label>
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 bg-white text-sm focus:outline-none placeholder:text-gray-500 border border-[#d9d9d9]"
                    style={{ height: '46px', paddingRight: '52px' }}
                    required
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="absolute top-0 right-0 hover:opacity-70 transition-opacity flex items-center justify-center"
                    style={{ height: '46px', padding: '0 15px', border: 0, background: 'transparent' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3.75 9H14.25" />
                      <path d="M9 3.75L14.25 9L9 14.25" />
                    </svg>
                  </button>
                </form>
              )}
              <p className="text-[11px] mt-3" style={{ color: 'rgba(34,34,34,.8)' }}>
                By subscribing you agree to the{' '}
                <Link to="/policies/terms-of-service" className="underline">Terms of Use</Link> &{' '}
                <Link to="/policies/privacy-policy" className="underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>

          {/* Contact — 16% */}
          <div className="lg:order-2 lg:basis-[16%] lg:px-6">
            <LinkBlock
              title="Contact"
              links={[
                { label: 'Search', to: '/search' },
                { label: 'Returns & Refunds', to: '/pages/return-policy' },
                { label: 'Shipping & Delivery', to: '/pages/shipping-and-deliveries' },
                { label: 'FAQS', to: '/pages/faqs' },
              ]}
            />
          </div>

          {/* Shop — 10% */}
          <div className="lg:order-3 lg:basis-[10%] lg:px-6">
            <LinkBlock
              title="Shop"
              links={[
                { label: 'Rings', to: '/collections/rings' },
                { label: 'Earrings', to: '/collections/earrings' },
                { label: 'Bracelets', to: '/collections/bracelets-1' },
                { label: 'Necklaces', to: '/collections/necklaces' },
              ]}
            />
          </div>

          {/* Company — 16% */}
          <div className="lg:order-4 lg:basis-[16%] lg:px-6">
            <LinkBlock
              title="Company"
              links={[
                { label: 'Rings', to: '/collections/rings' },
                { label: 'Diamonds', to: '/pages/diamond' },
                { label: 'Contact', to: '/pages/contact' },
                { label: 'About', to: '/pages/about-us' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* site-footer__bottom — live: 5rem 0 6rem (mobile 1rem/3.2rem) */}
      <div style={{ borderTop: '0.1rem solid #ededed' }}>
        <div className="container pt-4 pb-[3.2rem] lg:pt-[5rem] lg:pb-[6rem]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">© 2026, MITVA JEWELS L.L.C.</p>
            <div className="flex items-center flex-wrap justify-center" style={{ gap: '1rem' }}>
              {paymentMethods.map((method) => (
                <span key={method.name} title={method.name} className="inline-flex">
                  {method.svg}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
