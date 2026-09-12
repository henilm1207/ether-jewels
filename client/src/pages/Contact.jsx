import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Phone, MapPin, Mail } from 'lucide-react';
import { apiUrl, CONTACT } from '../config';

const INFO = [
  {
    icon: Phone,
    label: 'Phone',
    value: <a href={CONTACT.phoneHref} className="hover:opacity-70">{CONTACT.phone}</a>,
  },
  {
    icon: MapPin,
    label: 'Address',
    value: CONTACT.address,
  },
  {
    icon: Mail,
    label: 'Email',
    value: (
      <a href={`mailto:${CONTACT.email}`} className="hover:opacity-70">
        {CONTACT.email}
      </a>
    ),
  },
];

/* Live design-2: underline fields — no box, bottom hairline only */
const fieldStyle = {
  border: 0,
  borderBottom: '1px solid #ededed',
  borderRadius: 0,
  padding: 0,
  boxShadow: 'none',
  color: '#222',
};

export default function Contact() {
  const location = useLocation();
  const bulk = !!(location.state && location.state.bulk);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/inquiries'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to send. Please try again.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full bg-transparent text-[14px] focus:outline-none placeholder:text-[rgba(34,34,34,0.75)]';

  return (
    <>
      <section className="py-10 md:py-[100px]">
        <div className="container">
          <div className="mx-auto" style={{ maxWidth: '770px' }}>
            {/* Header — live: centered, no eyebrow */}
            <div className="text-center mb-10 md:mb-[60px]">
              <h1
                className="font-heading"
                style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', letterSpacing: '1px', marginBottom: '12px' }}
              >
                Contact Us
              </h1>
              <p
                className="font-heading"
                style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.375rem)', color: '#222' }}
              >
                Have questions about a piece or looking for the perfect diamond?
                <br />
                Our experts are here to help.
              </p>
            </div>

            {bulk && (
              <p role="status" className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded mx-auto" style={{ padding: '12px 16px', marginBottom: '32px', maxWidth: '560px' }}>
                Ordering 6 or more items? Send us your requirement below and our seller will get back with a bulk quote.
              </p>
            )}

            {submitted ? (
              <div role="status" className="text-center py-12 bg-[#f7f2ef]">
                <h2
                  className="font-heading mb-3"
                  style={{ fontSize: '1.5rem', letterSpacing: '1px' }}
                >
                  Thank you!
                </h2>
                <p className="text-gray-600 text-[15px]">
                  Your message has been sent. We&apos;ll get back to you within 24 hours.
                </p>
                <button type="button" onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', email: '', message: '' }); }} className="btn btn--underline" style={{ color: '#222', marginTop: '16px' }}>
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-name" className="sr-only">Name</label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      placeholder="Name"
                      value={form.name}
                      onChange={handleChange}
                      autoComplete="name"
                      className={inputClass}
                      style={{ ...fieldStyle, height: '46px' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="sr-only">Phone number</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="phone"
                      placeholder="Enter your phone number"
                      value={form.phone}
                      onChange={handleChange}
                      pattern="[+]?[0-9\s\-()]{7,20}"
                      autoComplete="tel"
                      spellCheck={false}
                      autoCapitalize="off"
                      className={inputClass}
                      style={{ ...fieldStyle, height: '46px' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-email" className="sr-only">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    autoComplete="email"
                    spellCheck={false}
                    autoCapitalize="off"
                    className={inputClass}
                    style={{ ...fieldStyle, height: '46px' }}
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="sr-only">Message (min 10 characters)</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    placeholder="Your Message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    minLength={10}
                    aria-required="true"
                    rows={3}
                    className={inputClass}
                    style={{ ...fieldStyle, lineHeight: '24px' }}
                  />
                </div>

                {error && <p role="alert" className="text-sm text-red-700 text-center">{error}</p>}

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn btn--underline disabled:opacity-50"
                    style={{ color: '#222', marginTop: '10px' }}
                  >
                    {sending ? 'Sending…' : 'Submit Now'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Contact info strip — live: full-width section below the form */}
      <div style={{ padding: '40px 20px', background: '#fff' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 text-center" style={{ gap: '40px' }}>
          {INFO.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <Icon size={40} strokeWidth={1} aria-hidden="true" className="mx-auto" style={{ color: '#222', marginBottom: '16px' }} />
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{label}</p>
              <div style={{ fontSize: '16px', color: '#222', overflowWrap: 'anywhere' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
