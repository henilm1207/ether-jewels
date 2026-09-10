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
    <section className="py-[40px] bg-white">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {badges.map((badge) => (
            <div key={badge.title} className="text-center">
              <h4
                className="mb-1"
                style={{
                  fontSize: 'clamp(0.875rem, 2vw, 1.375rem)',
                  fontWeight: 400,
                  fontFamily: "'Playfair Display', serif",
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {badge.title}
              </h4>
              <p className="text-gray-500" style={{ fontSize: '0.9375rem' }}>
                {badge.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
