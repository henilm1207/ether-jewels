import { Link } from 'react-router-dom';
import { shapes } from '../data/products';

export default function Diamond() {
  return (
    <section className="py-8 md:py-12">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <p className="text-subheading text-gray-500 mb-2">
            Education
          </p>
          <h1
            className="font-heading mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '1px' }}
          >
            The Diamond Guide
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-[15px]">
            Every MITVA diamond is lab-grown, IGI certified, and crafted to the highest standards
            of quality and sustainability.
          </p>
        </div>

        {/* The 4 Cs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {[
            {
              title: 'Cut',
              description: 'The cut determines a diamond\'s brilliance. Our diamonds are cut to exact proportions for maximum light return and sparkle.',
            },
            {
              title: 'Color',
              description: 'Graded on a scale from D (colorless) to Z. We offer D-F color diamonds — the rarest and most valuable.',
            },
            {
              title: 'Clarity',
              description: 'Measures the presence of internal or external characteristics. Our diamonds are VS2 clarity or higher.',
            },
            {
              title: 'Carat',
              description: 'The weight of the diamond. Larger carat weights are rarer and more valuable, but all sizes sparkle beautifully.',
            },
          ].map((c) => (
            <div key={c.title} className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#f7f2ef] rounded-full flex items-center justify-center">
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.25rem',
                  }}
                >
                  {c.title[0]}
                </span>
              </div>
              <h3
                className="mb-2"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {c.title}
              </h3>
              <p className="text-[14px] text-gray-600 leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>

        {/* Shop by Shape */}
        <div className="mb-16">
          <h2
            className="font-heading text-center mb-8"
            style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', letterSpacing: '1px' }}
          >
            Shop by Diamond Shape
          </h2>
          <div className="flex justify-center items-center flex-wrap gap-8 md:gap-12">
            {shapes.map((shape) => (
              <Link
                key={shape.slug}
                to={`/collections/${shape.slug}`}
                className="group text-center"
              >
                <div
                  className="flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-105"
                  style={{ width: '85px', height: '85px' }}
                >
                  <img
                    src={shape.image}
                    alt={shape.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: '#3a3a3a',
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {shape.name}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Lab Grown */}
        <div className="bg-[#f7f2ef] p-8 md:p-12 lg:p-16 text-center">
          <h2
            className="font-heading mb-4"
            style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', letterSpacing: '1px' }}
          >
            Why Lab-Grown Diamonds?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed text-[15px]">
            Lab-grown diamonds are physically, chemically, and optically identical to mined diamonds.
            They are created in controlled environments using advanced technology, offering the same
            brilliance and durability at a more accessible price point — while being more
            environmentally conscious.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div>
              <h4
                className="font-medium mb-1"
                style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', letterSpacing: '1px' }}
              >
                Identical Quality
              </h4>
              <p className="text-[14px] text-gray-600">Same optical & physical properties</p>
            </div>
            <div>
              <h4
                className="font-medium mb-1"
                style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', letterSpacing: '1px' }}
              >
                Ethically Sourced
              </h4>
              <p className="text-[14px] text-gray-600">No mining, minimal environmental impact</p>
            </div>
            <div>
              <h4
                className="font-medium mb-1"
                style={{ fontFamily: "'Playfair Display', serif", textTransform: 'uppercase', letterSpacing: '1px' }}
              >
                IGI Certified
              </h4>
              <p className="text-[14px] text-gray-600">Independently graded & certified</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
