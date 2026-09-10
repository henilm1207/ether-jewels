import { Link } from 'react-router-dom';

export default function HeroSlideshow() {
  return (
    <section className="relative w-full h-[580px] md:h-[740px] lg:h-[800px] overflow-hidden">
      {/* Background Image - full width, no container */}
      <div className="absolute inset-0">
        <img
          src="/images/hero-banner.png"
          alt="MITVA JEWELS - Engagement Rings"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
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
              style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', letterSpacing: '2.5px' }}
            >
              Engagement Rings
            </h1>
            <Link
              to="/collections/solitaire-rings"
              className="btn--underline text-white inline-flex items-center gap-2 group animate-fade-in-up delay-200"
              style={{ fontSize: '13px', letterSpacing: '3px' }}
            >
              Shop Now
              <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-2">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
