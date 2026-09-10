import InfoShell from './InfoShell';

const faqs = [
  {
    q: 'Are your diamonds real?',
    a: 'Yes. Every MITVA diamond is a real, lab-grown diamond — physically, chemically and optically identical to mined diamonds — and certified by GIA, IGI or SHC.',
  },
  {
    q: 'What does “Setting Only — Center Diamond Not Included” mean?',
    a: 'The listed price covers the handcrafted setting. You choose your center diamond separately, and the final price depends on the diamond, karatage and metal you select.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Each piece is made-to-order and typically delivered within 30 days, shipped fully insured, door to door.',
  },
  {
    q: 'Is shipping free?',
    a: 'Yes — insured worldwide shipping is complimentary on all orders over $1,000.',
  },
  {
    q: 'Can I customize a design?',
    a: 'Absolutely. Choose the shape, diamond and metal, or share a custom idea — our experts will guide you 1-on-1 over WhatsApp (+971 58 606 2080) or email (sales@mitvajewels.com).',
  },
  {
    q: 'What is your return policy?',
    a: 'Unworn pieces in original condition may be returned within 14 days. Custom, engraved or resized pieces are final sale unless faulty. See our Returns & Refunds page for details.',
  },
];

export default function Faqs() {
  return (
    <InfoShell title="FAQs" eyebrow="Help">
      <div>
        {faqs.map((f) => (
          <details key={f.q} className="group" style={{ borderBottom: '1px solid #ededed', padding: '18px 0' }}>
            <summary className="flex items-center justify-between cursor-pointer list-none text-[15px] font-medium">
              {f.q}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-open:rotate-180 flex-shrink-0" style={{ marginLeft: '16px' }} aria-hidden="true">
                <path d="M2 4l4 4 4-4" />
              </svg>
            </summary>
            <p className="text-gray-600" style={{ fontSize: '15px', lineHeight: 1.7, paddingTop: '12px', paddingRight: '28px' }}>
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </InfoShell>
  );
}
