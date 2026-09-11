import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { apiUrl } from '../../config';

export default function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const openRef = useRef(false);
  const subscribedRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { subscribedRef.current = subscribed; }, [subscribed]);

  const handleClose = useCallback(() => {
    setOpen(false);
    sessionStorage.setItem('etherstar-newsletter-dismissed', 'true');
  }, []);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('etherstar-newsletter-dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => {
      if (sessionStorage.getItem('etherstar-newsletter-dismissed')) return;
      if (openRef.current || subscribedRef.current) return;
      if (window.scrollY > 300) setOpen(true);
    }, 5000);

    const handleScroll = () => {
      if (openRef.current || subscribedRef.current) return;
      if (window.scrollY > 300 && !sessionStorage.getItem('etherstar-newsletter-dismissed')) {
        setOpen(true);
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleEsc);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [handleClose]);

  const closeTimer = useRef(null);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/newsletter/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'popup' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Subscription failed');
      setSubscribed(true);
      setEmail('');
      closeTimer.current = setTimeout(handleClose, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Newsletter signup" className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-0 animate-fade-in" style={{ paddingTop: '40px' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(68,68,68,0.64)' }} onClick={handleClose} />
      <div
        className="relative bg-white w-full flex flex-col md:flex-row overflow-hidden animate-fade-in-up z-10"
        style={{ maxWidth: '500px', maxHeight: '90vh', width: 'min(500px, 90vw)' }}
      >
        {/* Close — 30px circle, rotates on hover */}
        <button
          onClick={handleClose}
          aria-label="Close popup"
          className="absolute z-10 bg-white rounded-full flex items-center justify-center popup-close"
          style={{ width: '30px', height: '30px', top: '8px', right: '16px', transition: 'transform .3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(180deg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0deg)'; }}
        >
          <X size={18} />
        </button>

        {/* Image */}
        <div className="w-full md:w-[45%] aspect-square md:aspect-auto bg-[#f7f2ef] flex-shrink-0">
          <img
            src="/images/newsletter-popup.png"
            alt="Welcome to Ether"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content — live inner padding 30px */}
        <div className="flex-1 flex flex-col justify-center" style={{ padding: '30px' }}>
          <h2 className="font-heading" style={{ fontSize: '24px', marginBottom: '12px' }}>Welcome to Ether</h2>
          <p className="text-[15px] text-gray-600" style={{ marginBottom: '24px' }}>
            Enjoy <strong>5% off your first order</strong> and early access to new collections.
          </p>

          {subscribed ? (
            <p role="status" className="text-[15px]">You have already subscribed!</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
              <label htmlFor="popup-newsletter-email" className="sr-only">Email</label>
              <input
                id="popup-newsletter-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                style={{ marginBottom: '12px' }}
                required
                disabled={loading}
              />
              {error && <p role="alert" className="text-sm text-red-700" style={{ marginBottom: '12px' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn btn--primary w-full disabled:opacity-50"
              >
                {loading ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
