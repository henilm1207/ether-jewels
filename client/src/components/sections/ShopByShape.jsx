import { Link } from 'react-router-dom';
import { shapes } from '../../data/products';

export default function ShopByShape() {
  return (
    <section className="bg-white" style={{ paddingTop: '50px', paddingBottom: '50px' }}>
      <div className="container">
        <h2
          className="text-center uppercase"
          style={{
            fontSize: '20px',
            fontWeight: 400,
            letterSpacing: '4px',
            fontFamily: "'Playfair Display', serif",
            marginBottom: '36px',
          }}
        >
          Shop By Shape
        </h2>

        <div
          className="flex md:justify-center md:flex-wrap items-start overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory gap-5 md:gap-x-16 md:gap-y-12"
        >
          {shapes.map((shape) => (
            <Link
              key={shape.slug}
              to={`/collections/${shape.slug}`}
              className="flex-shrink-0 flex flex-col items-center group snap-start"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105 w-[72px] h-[72px] md:w-[92px] md:h-[92px]"
              >
                <img
                  src={shape.image}
                  alt={shape.name}
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </div>
              <p
                className="text-center transition-colors duration-300 group-hover:text-black"
                style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                  color: '#3a3a3a',
                  opacity: 0.85,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {shape.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
