import { useState } from 'react';
import { Phone, MapPin, Mail } from 'lucide-react';

const INFO = [
  {
    icon: Phone,
    label: 'Phone',
    value: <a href="tel:+971586062080" className="hover:opacity-70">+971 58 606 2080</a>,
  },
  {
    icon: MapPin,
    label: 'Address',
    value: 'Dubai, UAE',
  },
  {
    icon: Mail,
    label: 'Email',
    value: (
      <a href="mailto:etherstarjewels@gmail.com" className="hover:opacity-70">
        etherstarjewels@gmail.com
      </a>
    ),
  },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputClass =
    'w-full px-4 py-3 border border-[#ededed] text-[14px] focus:outline-none focus:border-[#222]';

  return (
    <section className="py-10 md:py-[100px]">
      <div className="container">
        <div className="mx-auto" style={{ maxWidth: '770px' }}>
          {/* Header — live: centered, no eyebrow */}
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <h1
              className="font-heading"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '1px', marginBottom: '12px' }}
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

          {submitted ? (
            <div className="text-center py-12 bg-[#f7f2ef]">
              <h2
                className="font-heading mb-3"
                style={{ fontSize: '1.5rem', letterSpacing: '1px' }}
              >
                Thank you!
              </h2>
              <p className="text-gray-600 text-[15px]">
                Your message has been sent. We&apos;ll get back to you within 24 hours.
              </p>
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
                    style={{ height: '46px' }}
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
                    autoComplete="tel"
                    className={inputClass}
                    style={{ height: '46px' }}
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
                  autoComplete="email"
                  className={inputClass}
                  style={{ height: '46px' }}
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="sr-only">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Your Message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="text-center">
                <button type="submit" className="btn btn--underline" style={{ color: '#222' }}>
                  Submit Now
                </button>
              </div>
            </form>
          )}

          {/* Contact Info — live: Phone / Address / Email */}
          <div className="grid grid-cols-1 md:grid-cols-3 text-center" style={{ gap: '40px', marginTop: '64px' }}>
            {INFO.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <Icon size={40} strokeWidth={1} aria-hidden="true" className="mx-auto" style={{ color: '#222', marginBottom: '16px' }} />
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{label}</p>
                <div style={{ fontSize: '16px', color: '#222', overflowWrap: 'anywhere' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
