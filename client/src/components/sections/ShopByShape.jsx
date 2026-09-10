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
          className="flex md:justify-center md:flex-wrap items-start overflow-x-auto pb-2 scrollbar-hide"
          style={{ gap: '2.5rem 3.75rem' }}
        >
          {shapes.map((shape) => (
            <Link
              key={shape.slug}
              to={`/collections/${shape.slug}`}
              className="flex-shrink-0 flex flex-col items-center group"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105"
                style={{ width: '85px', height: '85px' }}
              >
                <img
                  src={shape.image}
                  alt={shape.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <p
                className="text-center transition-colors duration-300 group-hover:text-black"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: '#3a3a3a',
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
