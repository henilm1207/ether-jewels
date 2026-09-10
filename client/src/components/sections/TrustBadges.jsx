// Live multicolumn: 40px section padding, h4 titles, 15px subs — no icons.
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
    <section className="bg-white" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 md:gap-8">
          {badges.map((badge) => (
            <div key={badge.title} className="text-center px-2">
              <h3
                className="font-heading trust-title"
                style={{ margin: 0 }}
              >
                {badge.title}
              </h3>
              <p style={{ fontSize: '15px', marginTop: '12px' }}>
                {badge.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .trust-title { font-size: 22px; line-height: 1.2; }
        @media (max-width: 639px) { .trust-title { font-size: 17.6px; } }
      `}</style>
    </section>
  );
}
