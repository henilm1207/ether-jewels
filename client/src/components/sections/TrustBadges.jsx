import { Gem, Truck, Factory, ShieldCheck } from 'lucide-react';

const badges = [
  {
    icon: Gem,
    title: 'IGI / GIA Certified',
    subtitle: 'Every diamond, with certificate',
  },
  {
    icon: Truck,
    title: 'Free USA Shipping',
    subtitle: 'On Orders Over $1,000',
  },
  {
    icon: Factory,
    title: 'Made-to-Order',
    subtitle: 'Crafted in Surat, India',
  },
  {
    icon: ShieldCheck,
    title: 'Insured Shipping',
    subtitle: 'Covered Door to Door',
  },
];

export default function TrustBadges() {
  return (
    <section className="bg-white border-y border-[#ededed]" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 md:gap-8">
          {badges.map((badge) => (
            <div key={badge.title} className="text-center px-2">
              <badge.icon size={24} strokeWidth={1.25} className="mx-auto mb-4 text-[#222]" aria-hidden="true" />
              <h4
                className="mb-1.5"
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  fontFamily: "'Playfair Display', serif",
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
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
