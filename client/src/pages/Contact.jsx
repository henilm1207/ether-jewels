import { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-subheading text-gray-500 mb-2">
              Get in Touch
            </p>
            <h1
              className="font-heading mb-4"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '1px' }}
            >
              Contact Us
            </h1>
            <p className="text-gray-600 text-[15px]">
              Have a question? We'd love to hear from you. Send us a message and we'll respond as
              soon as possible.
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
                Your message has been sent. We'll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-[#ededed] text-[14px] focus:outline-none focus:border-[#222]"
                    style={{ height: '46px' }}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-[#ededed] text-[14px] focus:outline-none focus:border-[#222]"
                    style={{ height: '46px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#ededed] text-[14px] focus:outline-none focus:border-[#222]"
                  style={{ height: '46px' }}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-2">Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-[#ededed] text-[14px] focus:outline-none focus:border-[#222] resize-none"
                />
              </div>

              <button type="submit" className="btn btn--primary w-full">
                Send Message
              </button>
            </form>
          )}

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-center">
            <div>
              <h3
                className="mb-2"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Email
              </h3>
              <a href="mailto:etherstarjewels@gmail.com" className="text-[14px] text-gray-600 hover:text-[#222]">
                etherstarjewels@gmail.com
              </a>
            </div>
            <div>
              <h3
                className="mb-2"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Location
              </h3>
              <p className="text-[14px] text-gray-600">Dubai, UAE</p>
            </div>
            <div>
              <h3
                className="mb-2"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Hours
              </h3>
              <p className="text-[14px] text-gray-600">Mon – Fri, 9am – 6pm GST</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
