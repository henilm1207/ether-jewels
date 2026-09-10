import { Link } from 'react-router-dom';

export default function HeroSlideshow() {
  return (
    <section className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
      {/* Background Image - full width, no container */}
      <div className="absolute inset-0">
        <img
          src="/images/hero-banner.png"
          alt="MITVA JEWELS - Engagement Rings"
          className="w-full h-full object-cover"
        />
        {/* Prestige-style bottom-left gradient so text stays legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Content - positioned left bottom */}
      <div className="relative h-full flex items-end pb-14 md:pb-20">
        <div className="container">
          <div className="max-w-lg text-left">
            <p
              className="mb-3 animate-fade-in-up delay-0 text-white/90"
              style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.5px' }}
            >
              Lab Grown · IGI Certified
            </p>
            <h1
              className="font-heading text-white mb-6 leading-tight animate-fade-in-up delay-100"
              style={{ fontSize: 'clamp(1.75rem, 4.5vw, 2.5rem)', letterSpacing: '1px' }}
            >
              Engagement Rings
            </h1>
            <Link
              to="/collections/solitaire-rings"
              className="btn--underline text-white inline-block animate-fade-in-up delay-200"
              style={{ fontSize: '13px', letterSpacing: '2px' }}
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
