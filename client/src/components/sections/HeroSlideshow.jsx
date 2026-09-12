import { Link } from 'react-router-dom';
import ProtectedImage from '../ui/ProtectedImage';

export default function HeroSlideshow() {
  return (
    <section className="relative w-full overflow-hidden hero-slideshow-height" style={{ height: '420px' }}>
      {/* Background Image - full width, no container */}
      <div className="absolute inset-0">
        <ProtectedImage
          src="/images/hero-banner.png"
          alt="EtherStar Jewels - Engagement Rings"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(68,68,68,0.6)' }} />
      </div>

      {/* Content - left bottom, live: 30px mobile / 50px 0 desktop, 50% width */}
      <div className="relative h-full flex items-end">
        <div className="container w-full">
          <div
            className="text-left animate-fade-in-up hero-slideshow-content"
            style={{ padding: '30px 0', width: 'calc(100% - 30px)', color: '#fff' }}
          >
            <p className="text-subheading" style={{ marginBottom: '12px', color: '#fff' }}>
              Lab Grown · IGI Certified
            </p>
            <h2
              className="font-heading hero-slideshow-title"
              style={{ fontSize: '22px', color: '#fff', marginBottom: '32px' }}
            >
              Engagement Rings
            </h2>
            <Link
              to="/collections/rings-1"
              className="btn--underline inline-flex items-center gap-2 group"
              style={{ color: '#fff', letterSpacing: '3px' }}
            >
              Shop Now
              <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-2">→</span>
            </Link>
          </div>
        </div>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .hero-slideshow-height { height: 720px !important; }
          .hero-slideshow-content { max-width: 50%; padding: 50px 0 !important; }
          .hero-slideshow-title { font-size: 28px !important; }
        }
      `}</style>
    </section>
  );
}
