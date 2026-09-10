const badges = [
  {
    title: 'IGI / GIA Certified',
    subtitle: 'Every diamond, with certificate',
  },
  {
    title: 'Free USA Shipping',
    subtitle: 'On Orders Over $1,000',
  },
  {
    title: 'Made-to-Order',
    subtitle: 'Crafted in Surat, India',
  },
  {
    title: 'Insured Shipping',
    subtitle: 'Covered Door to Door',
  },
];

export default function TrustBadges() {
  return (
    <section className="bg-white border-t border-[#ededed]" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6 md:gap-8">
          {badges.map((badge) => (
            <div key={badge.title} className="text-center px-2">
              <h4
                className="mb-1.5"
                style={{
                  fontSize: 'clamp(0.95rem, 2vw, 1.25rem)',
                  fontWeight: 400,
                  fontFamily: "'Playfair Display', serif",
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  lineHeight: 1.3,
                }}
              >
                {badge.title}
              </h4>
              <p className="text-gray-500" style={{ fontSize: '14px' }}>
                {badge.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
