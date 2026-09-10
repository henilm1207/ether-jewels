import { useState } from 'react';
import { Link } from 'react-router-dom';

/* Branded payment badges in live order — 38x24, hairline border, square corners */
const paymentMethods = [
  {
    name: 'American Express',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="American Express">
        <rect width="38" height="24" fill="#0071CE" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <text x="19" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="0.5">AMEX</text>
      </svg>
    ),
  },
  {
    name: 'Apple Pay',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Apple Pay">
        <rect width="38" height="24" fill="#000" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <g transform="translate(-1,-0.5)">
          <path fill="#fff" d="M15.36 13.76c0-1.54 1.26-2.28 1.32-2.32-.72-1.05-1.84-1.19-2.23-1.21-.95-.1-1.86.56-2.34.56-.48 0-1.23-.55-2.02-.53-1.04.01-2 .6-2.53 1.53-1.08 1.87-.27 4.64.78 6.16.51.74 1.13 1.58 1.93 1.54.78-.03 1.07-.5 2.01-.5s1.2.5 2.03.49c.84-.02 1.37-.76 1.88-1.5.6-.87.84-1.71.86-1.75-.02-.01-1.64-.63-1.69-2.47zM13.98 8.84c.43-.52.72-1.24.64-1.95-.62.02-1.36.41-1.8.92-.4.46-.74 1.19-.65 1.89.7.05 1.4-.35 1.81-.86z" />
        </g>
        <text x="29" y="16" textAnchor="middle" fontSize="8" fontWeight="500" fill="#fff" fontFamily="-apple-system, Helvetica, Arial, sans-serif">Pay</text>
      </svg>
    ),
  },
  {
    name: 'Diners Club',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Diners Club">
        <rect width="38" height="24" fill="#fff" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <clipPath id="dc-clip"><circle cx="11.5" cy="12" r="7" /></clipPath>
        <g clipPath="url(#dc-clip)">
          <rect x="4.5" y="5" width="7" height="14" fill="#0079BE" />
          <rect x="11.5" y="5" width="7" height="14" fill="#ffffff" />
        </g>
        <circle cx="11.5" cy="12" r="7" fill="none" stroke="#0079BE" strokeWidth="1.1" />
        <text x="28" y="11" textAnchor="middle" fontSize="4.8" fontWeight="800" fill="#004B87" fontFamily="Arial, Helvetica, sans-serif">DINERS</text>
        <text x="28" y="16.4" textAnchor="middle" fontSize="4.8" fontWeight="800" fill="#004B87" fontFamily="Arial, Helvetica, sans-serif">CLUB</text>
      </svg>
    ),
  },
  {
    name: 'Discover',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Discover">
        <rect width="38" height="24" fill="#fff" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <text x="18" y="12" textAnchor="middle" fontSize="6.2" fontWeight="800" fill="#111" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="0.3">DISCOVER</text>
        <path d="M4.5 16.8c4.2 1.7 9.4 2.4 14 2.1 3.8-.2 7-1 9.8-2.1" fill="none" stroke="#F48120" strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="29.8" cy="14.8" r="3" fill="#F48120" />
        <circle cx="29.8" cy="14.8" r="3" fill="none" stroke="#fff" strokeWidth="0.8" />
      </svg>
    ),
  },
  {
    name: 'Google Pay',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Google Pay">
        <rect width="38" height="24" fill="#fff" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <g transform="translate(5,5) scale(0.5833)">
          <path fill="#EA4335" d="M12 4.7c1.8 0 3.4.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.5 1.4 6.7l3.8 2.9c.9-2.9 3.6-4.9 6.8-4.9z" />
          <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.6-5 3.6-8.4z" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.8c-1 .7-2.4 1.1-4.2 1.1-3.2 0-5.9-2.1-6.8-5H1.4v2.9C3.3 21.5 7.3 24 12 24z" />
          <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4V6.7H1.4C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.3l3.8-2.9z" />
        </g>
        <text x="27.5" y="16" textAnchor="middle" fontSize="8" fontWeight="500" fill="#5F6368" fontFamily="Arial, Helvetica, sans-serif">Pay</text>
      </svg>
    ),
  },
  {
    name: 'JCB',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="JCB">
        <rect width="38" height="24" fill="#fff" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <rect x="5" y="5.5" width="8" height="13" fill="#0B4EA2" />
        <rect x="15" y="5.5" width="8" height="13" fill="#CC0000" />
        <rect x="25" y="5.5" width="8" height="13" fill="#009A44" />
        <text x="9" y="15" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">J</text>
        <text x="19" y="15" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">C</text>
        <text x="29" y="15" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">B</text>
      </svg>
    ),
  },
  {
    name: 'Mastercard',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Mastercard">
        <rect width="38" height="24" fill="#232323" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <circle cx="15.5" cy="12" r="6" fill="#EB001B" />
        <circle cx="22.5" cy="12" r="6" fill="#F79E1B" />
        <path d="M19 7.127 A6 6 0 0 0 19 16.873 A6 6 0 0 0 19 7.127 Z" fill="#FF5F00" />
      </svg>
    ),
  },
  {
    name: 'Visa',
    svg: (
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Visa">
        <rect width="38" height="24" fill="#fff" />
        <rect width="38" height="24" fill="none" stroke="#000" strokeOpacity="0.07" />
        <text x="19" y="16.5" textAnchor="middle" fontSize="10" fontWeight="800" fontStyle="italic" fill="#142FBD" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="0.5">VISA</text>
      </svg>
    ),
  },
];

const blockTitleStyle = {
  fontSize: '16px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '24px',
};

const linkClass = 'text-[15px] hover:text-[#222] transition-colors';
const linkStyle = { color: '#222', lineHeight: '30px' };

/* Link column — static heading on desktop, collapsible details on mobile */
function LinkBlock({ title, links }) {
  return (
    <div>
      {/* Desktop — heading is display-only (live: pointer-events:none) */}
      <div className="hidden lg:block pointer-events-none">
        <h6 className="mb-4" style={blockTitleStyle}>{title}</h6>
        <ul>
              {links.map((link) => (
                <li key={link.label} style={{ lineHeight: '30px' }}>
                  <Link to={link.to} className={linkClass} style={linkStyle}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
      {/* Mobile — collapsible */}
      <details className="lg:hidden group" style={{ borderBottom: '1px solid rgba(34,34,34,.1)' }}>
        <summary className="flex items-center justify-between py-4 cursor-pointer list-none" style={{ fontSize: '16px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {title}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-open:rotate-180" aria-hidden="true">
            <path d="M2 4l4 4 4-4" />
          </svg>
        </summary>
        <div className="pb-8">
            <ul>
              {links.map((link) => (
                <li key={link.label} style={{ lineHeight: '30px' }}>
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
    <footer className="bg-[#ece7e3]" style={{ borderTop: '0.1rem solid #ededed' }}>
      {/* site-footer__top — live: 8rem 0 1.5rem (mobile 3.2rem top) */}
      <div className="container pt-[5rem] pb-6 lg:pt-[10rem] lg:pb-[1.5rem]">
        {/* f-column flex percentages — newsletter last in DOM, right on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-start">
          {/* Logo — 20%, centered in its column on desktop */}
          <div className="lg:order-1 lg:basis-[20%] mb-8 lg:mb-0 lg:pr-6 lg:flex lg:justify-center">
            <Link to="/">
              <img src="/images/logo.png" alt="ETHERSTAR JEWELS" style={{ maxWidth: '150px' }} />
            </Link>
          </div>

          {/* Newsletter — 36%, order 9 on desktop (right) */}
          <div className="order-2 lg:order-9 lg:basis-[36%] mb-8 lg:mb-0 lg:pl-6">
            <div className="lg:max-w-[420px] lg:ml-auto">
              <h6 className="mb-3" style={blockTitleStyle}>
                Join the Etherstar Club
              </h6>
              <p className="text-sm mb-4" style={{ color: 'rgba(34,34,34,.8)' }}>
                Subscribe for store updates and discounts.
              </p>
              {subscribed ? (
                <p className="text-sm text-green-700">Thank you for subscribing!</p>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="flex items-stretch"
                  style={{ border: '1px solid #222', background: 'transparent', height: '46px' }}
                >
                  <label htmlFor="footer-newsletter-email" className="sr-only">Email</label>
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 min-w-0 px-4 bg-transparent text-sm focus:outline-none placeholder:text-gray-500"
                    style={{ border: 0 }}
                    required
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="hover:opacity-70 transition-opacity flex items-center justify-center flex-shrink-0"
                    style={{ width: '52px', border: 0, background: 'transparent' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3.75 9H14.25" />
                      <path d="M9 3.75L14.25 9L9 14.25" />
                    </svg>
                  </button>
                </form>
              )}
              <p className="text-[11px]" style={{ color: 'rgba(34,34,34,.8)', marginTop: '16px' }}>
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
                { label: 'My account', to: '/account/login' },
              ]}
            />
          </div>

          {/* Shop — 10% */}
          <div className="lg:order-3 lg:basis-[10%] lg:px-6">
            <LinkBlock
              title="Shop"
              links={[
                { label: 'Rings', to: '/collections/rings' },
                { label: 'EarRings', to: '/collections/earrings' },
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
                { label: 'RINGS', to: '/collections/rings' },
                { label: 'Diamonds', to: '/pages/diamond' },
                { label: 'Contact', to: '/pages/contact' },
                { label: 'About', to: '/pages/about-us' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* site-footer__bottom — live: 5rem 0 6rem (mobile 1rem/3.2rem), no divider */}
      <div>
        <div className="container pt-4 pb-[5rem] lg:pt-[5rem] lg:pb-[8rem]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm" style={{ color: '#222' }}>
              © 2026, <Link to="/" className="underline underline-offset-2 hover:opacity-70">ETHERSTAR JEWELS</Link>.
            </p>
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
