import { Link } from 'react-router-dom';
import { shapes } from '../../data/shapes';

export default function ShopByShape() {
  return (
    <section className="bg-white" style={{ padding: '30px 0' }}>
      <div className="shape-container">
        <h2 className="shape-title">
          Shop By Shape
        </h2>

        <div className="shape-row scrollbar-hide">
          {shapes.map((shape) => (
            <Link
              key={shape.slug}
              to={`/collections/${shape.slug}`}
              className="shape-item group"
            >
              <div className="shape-image-wrapper">
                <img
                  src={shape.image}
                  alt={shape.name}
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="shape-name">
                {shape.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
      <style>{`
        .shape-container { max-width: 1340px; margin: 0 auto; padding: 0 20px; }
        .shape-title {
          font-size: 20px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase;
          color: #000; font-family: var(--font-heading); margin: 0 0 30px; text-align: center;
        }
        .shape-row { display: flex; justify-content: center; gap: 60px; overflow-x: auto; }
        .shape-item { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; text-decoration: none; transition: transform .3s ease; }
        .shape-item:hover { transform: translateY(-5px); }
        .shape-image-wrapper { width: 85px; height: 85px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; }
        .shape-name {
          font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: #3a3a3a; font-family: var(--font-shape-name); text-align: center; transition: color .3s ease;
        }
        .shape-item:hover .shape-name { color: #000; }
        @media (max-width: 989px) {
          .shape-row { justify-content: flex-start; padding: 0 10px; }
          .shape-image-wrapper { width: 68px; height: 68px; }
          .shape-title { font-size: 16px; }
          .shape-name { font-size: 12.6px; }
        }
        @media (max-width: 749px) {
          .shape-image-wrapper { width: 59.5px; height: 59.5px; }
          .shape-title { font-size: 14px; }
          .shape-name { font-size: 11.2px; }
        }
      `}</style>
    </section>
  );
}
