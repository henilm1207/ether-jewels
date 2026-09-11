const VALUES = [
  {
    title: 'Certified Diamonds',
    text: 'We work with carefully selected diamonds that meet strict quality standards. Our diamonds are certified, ensuring authenticity, brilliance, and trust in every piece you wear.',
  },
  {
    title: 'Timeless Elegance',
    text: "Our designs are created to remain beautiful for years to come. Whether worn every day or on special occasions, Etherstar jewelry is made to express sophistication and personal style.",
  },
  {
    title: 'Exceptional Craftsmanship',
    text: 'Every Etherstar piece is carefully designed and crafted with precision and attention to detail. Our jewelry reflects timeless artistry and the highest standards of fine craftsmanship.',
  },
];

const MARQUEE = [
  'Certified Natural Diamonds',
  'Crafted to Last a Lifetime',
  'Luxury in Every Detail',
  'Timeless Luxury Designs',
];

const TEAM = [
  {
    image: '/images/about/team-diamond.png',
    title: 'Diamond Experts',
    text: 'Carefully selected diamonds that meet the highest standards of quality.',
  },
  {
    image: '/images/about/team-craftsmen.webp',
    title: 'Master Craftsmen',
    text: 'Each piece is handcrafted by skilled artisans who bring years of experience and precision to every detail.',
  },
  {
    image: '/images/about/team-design.webp',
    title: 'Design & Innovation',
    text: 'Our designers blend timeless elegance with modern style to create jewelry that feels both sophisticated and unique.',
  },
];

const bodyStyle = { fontSize: '15px', lineHeight: 1.7, color: '#222' };

export default function About() {
  return (
    <div>
      {/* 1 — Hero */}
      <section className="relative overflow-hidden flex items-center">
        <img
          src="/images/about/hero.jpg"
          alt="EtherStar Jewels"
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(68,68,68,0.76)' }} />
        <div className="container relative">
          <div
            className="text-center md:text-left mx-auto md:mx-0 py-16 md:py-24"
            style={{ maxWidth: '750px' }}
          >
            <p className="text-subheading" style={{ color: '#fff', marginBottom: '12px' }}>
              EtherStar Jewels
            </p>
            <h1
              className="font-heading"
              style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.2, marginBottom: '16px' }}
            >
              Where Timeless Design Meets Modern Luxury
            </h1>
            <p style={{ color: '#fff', fontSize: '15px', lineHeight: 1.7 }}>
              we believe true luxury lies in the details. Every piece is designed with precision
              and crafted to highlight the brilliance of carefully selected diamonds. Blending
              classic elegance with contemporary design, our jewelry is created to be worn,
              admired, and treasured for years to come.
            </p>
          </div>
        </div>
      </section>

      {/* 2 — Values */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 text-center">
            {VALUES.map((v) => (
              <div key={v.title}>
                <h3 className="font-heading" style={{ fontSize: '22px', marginBottom: '12px' }}>
                  {v.title}
                </h3>
                <p style={bodyStyle}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Our Story (image right) */}
      <section className="overflow-hidden pt-0 pb-[60px] md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center">
          <div className="px-[15px] md:px-0 md:pl-[100px] md:pr-[130px] py-6 md:py-0 order-2 md:order-1">
            <p className="text-subheading" style={{ marginBottom: '12px' }}>
              Our Story
            </p>
            <h2 className="font-heading" style={{ fontSize: '28px', marginBottom: '16px' }}>
              The Beginning of Etherstar Jewels
            </h2>
            <p style={bodyStyle}>
              Etherstar Jewels started with one simple idea: to make jewelry that lasts forever
              and tells your story. We know jewelry is more than just something pretty to wear.
              It holds your memories, marks the big moments in your life, and shows who you
              really are. Every piece we create is for people like you, people who want jewelry
              that feels real, looks beautiful, and never goes out of style.
            </p>
          </div>
          <div className="order-1 md:order-2">
            <img
              src="/images/about/story.jpg"
              alt="The Beginning of Etherstar Jewels"
              loading="lazy"
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>
      </section>

      {/* 4 — Marquee */}
      <div className="overflow-hidden" style={{ padding: '18px 0' }}>
        <div className="about-marquee flex hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span
              key={i}
              aria-hidden={i >= MARQUEE.length}
              className="mr-[40px] md:mr-[60px]"
              style={{ fontSize: '15px', whiteSpace: 'nowrap' }}
            >
              • {t}
            </span>
          ))}
        </div>
        <style>{`
          @keyframes about-marquee { to { transform: translateX(-50%); } }
          .about-marquee { animation: about-marquee 20s linear infinite; }
        `}</style>
      </div>

      {/* 5 — Exceptional Diamond Quality (image left) */}
      <section className="overflow-hidden pt-10 pb-[60px] md:py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center">
          <div>
            <img
              src="/images/about/quality.png"
              alt="Exceptional Diamond Quality"
              loading="lazy"
              className="w-full aspect-square object-cover"
            />
          </div>
          <div className="px-[15px] md:px-0 md:pl-[120px] md:pr-[172px] py-6 md:py-0">
            <h2 className="font-heading" style={{ fontSize: '28px', marginBottom: '16px', maxWidth: '40rem' }}>
              Exceptional Diamond Quality
            </h2>
            <p style={bodyStyle}>
              At Etherstar Jewels, every diamond is carefully selected for its brilliance,
              clarity, and beauty. Our commitment to quality ensures that each piece reflects
              the highest standards of fine jewelry craftsmanship. From elegant rings to
              timeless necklaces, every design is created to shine with lasting brilliance.
            </p>
          </div>
        </div>
      </section>

      {/* 6 — A Network of Expertise (image right) */}
      <section className="overflow-hidden pt-10 pb-[60px] md:py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center">
          <div className="px-[15px] md:px-0 md:pl-[100px] md:pr-[100px] py-6 md:py-0 order-2 md:order-1">
            <h2 className="font-heading" style={{ fontSize: '28px', marginBottom: '16px', maxWidth: '40rem' }}>
              A Network of Expertise
            </h2>
            <p style={bodyStyle}>
              Behind every Etherstar creation is a network of skilled artisans and trusted
              partners dedicated to excellence in fine jewelry. Through careful sourcing of
              diamonds and refined craftsmanship, we ensure that each piece reflects
              sophistication, brilliance, and lasting beauty.
            </p>
          </div>
          <div className="order-1 md:order-2">
            <img
              src="/images/about/network.png"
              alt="A Network of Expertise"
              loading="lazy"
              className="w-full aspect-[0.8] object-cover"
            />
          </div>
        </div>
      </section>

      {/* 7 — Masters Behind the Brilliance */}
      <section style={{ padding: '20px 0' }}>
        <div className="container">
          <div className="text-center mb-10 md:mb-[60px]">
            <h2
              className="font-heading"
              style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', marginBottom: 0 }}
            >
              Masters Behind the Brilliance
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TEAM.map((m) => (
              <div key={m.title} className="text-left">
                <img
                  src={m.image}
                  alt={m.title}
                  loading="lazy"
                  className="w-full aspect-square object-cover"
                  style={{ marginBottom: '20px' }}
                />
                <h3 className="font-heading" style={{ fontSize: '28px', marginBottom: '12px' }}>
                  {m.title}
                </h3>
                <p style={bodyStyle}>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
