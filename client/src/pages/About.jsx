export default function About() {
  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <p className="text-subheading text-gray-500 mb-2">
              Our Story
            </p>
            <h1
              className="font-heading mb-4"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '1px' }}
            >
              About MITVA
            </h1>
          </div>

          {/* Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center mb-16">
            <div className="aspect-[4/5] bg-[#f7f2ef] overflow-hidden">
              <img
                src="/images/experience-1.png"
                alt="MITVA Craftsmanship"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2
                className="font-heading mb-4"
                style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', letterSpacing: '1px' }}
              >
                Crafted with Purpose
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4 text-[15px]">
                MITVA JEWELS is a lab-grown diamond jewelry brand born from a passion for creating
                beautiful, sustainable, and accessible fine jewelry. Every piece is designed to
                celebrate life's most meaningful moments.
              </p>
              <p className="text-gray-600 leading-relaxed text-[15px]">
                Based in Dubai, UAE, we work with master craftsmen in Surat, India — the world's
                diamond capital — to bring our designs to life with precision and care.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: 'Lab-Grown Excellence',
                description: 'Every diamond we use is lab-grown and IGI certified, offering the same brilliance as mined diamonds with a fraction of the environmental impact.',
              },
              {
                title: 'Crafted In-House',
                description: 'From concept to completion, every piece is developed and finished under one roof, ensuring precision at every stage of the process.',
              },
              {
                title: 'Designed to Last',
                description: 'Balanced proportions, secure settings, and refined detailing — our jewelry is made for everyday wear and lifelong enjoyment.',
              },
            ].map((value) => (
              <div key={value.title} className="text-center">
                <h3
                  className="mb-3"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontSize: '1.125rem',
                  }}
                >
                  {value.title}
                </h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>

          {/* Promise */}
          <div className="bg-[#f7f2ef] p-8 md:p-12 text-center">
            <h2
              className="font-heading mb-4"
              style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', letterSpacing: '1px' }}
            >
              The MITVA Promise
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6 text-[15px]">
              We believe that fine jewelry should be both exquisite and accessible. That's why we
              combine lab-grown diamonds with expert craftsmanship to create pieces that are
              stunning, sustainable, and fairly priced.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-[13px]">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#222] rounded-full" />
                IGI Certified Diamonds
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#222] rounded-full" />
                Free USA Shipping
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#222] rounded-full" />
                Made-to-Order
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#222] rounded-full" />
                Insured Shipping
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
