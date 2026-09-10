import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('mitva-newsletter-dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => {
      const scrolled = window.scrollY > 300;
      if (scrolled) setOpen(true);
    }, 5000);

    const handleScroll = () => {
      if (window.scrollY > 300 && !sessionStorage.getItem('mitva-newsletter-dismissed')) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem('mitva-newsletter-dismissed', 'true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setSubscribed(true);
    setEmail('');
    setTimeout(handleClose, 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-0 animate-fade-in" style={{ paddingTop: '40px' }}>
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
            alt="Welcome to MITVA"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content — live inner padding 30px */}
        <div className="flex-1 flex flex-col justify-center" style={{ padding: '30px' }}>
          <h2 className="font-heading" style={{ fontSize: '24px', marginBottom: '12px' }}>Welcome to MITVA</h2>
          <p className="text-[15px] text-gray-600" style={{ marginBottom: '24px' }}>
            Enjoy <strong>5% off your first order</strong> and early access to new collections.
          </p>

          {subscribed ? (
            <p className="text-[15px]">You have already subscribed!</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                style={{ marginBottom: '12px' }}
                required
              />
              <button
                type="submit"
                className="btn btn--primary w-full"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
