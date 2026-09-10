import { Link } from 'react-router-dom';
import { shapes } from '../../data/products';

export default function ShopByShape() {
  return (
    <section className="py-[30px] bg-white">
      <div className="container">
        <h2
          className="text-center font-bold uppercase mb-[30px]"
          style={{
            fontSize: '20px',
            letterSpacing: '5px',
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Shop By Shape
        </h2>

        <div
          className="flex justify-center items-center overflow-x-auto pb-4 scrollbar-hide gap-[60px]"
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
    </section>
  );
}
