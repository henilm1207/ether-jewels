import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('etherstar-cookie-consent');
      if (!raw) {
        setVisible(true);
        return;
      }
      const parsed = JSON.parse(raw);
      const ts = parsed && parsed.ts ? Number(parsed.ts) : 0;
      // Re-prompt after 180 days or on version bump
      if (!parsed || parsed.v !== 1 || Date.now() - ts > 180 * 24 * 3600 * 1000) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const store = (choice) => {
    try {
      localStorage.setItem('etherstar-cookie-consent', JSON.stringify({ v: 1, choice, ts: Date.now() }));
    } catch {}
    setVisible(false);
  };

  const handleAccept = () => store('accepted');

  const handleDecline = () => store('declined');

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[150] bg-[#222] text-white p-4 md:p-5 animate-slide-up">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-300 text-center md:text-left">
          We use cookies to ensure you get the best experience on our website. By clicking on "Accept
          all" you consent to our use of cookies.{' '}
          <Link to="/policies/privacy-policy" className="underline text-white">Learn more.</Link>
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm border border-gray-500 hover:border-white transition-colors"
          >
            No, thanks
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-white text-[#222] font-medium hover:bg-gray-200 transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
