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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative bg-white w-full max-w-[500px] flex flex-col md:flex-row overflow-hidden animate-fade-in-up z-10">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1 bg-white/80 rounded-full hover:bg-white"
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

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
          <h2 className="font-heading text-xl md:text-2xl mb-2">Welcome to MITVA</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enjoy 5% off your first order and early access to new collections.
          </p>

          {subscribed ? (
            <p className="text-sm text-green-700">Thank you for subscribing!</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#222]"
                required
              />
              <button
                type="submit"
                className="w-full py-3 bg-[#222] text-white text-[13px] font-medium uppercase tracking-wider hover:bg-black transition-colors"
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
