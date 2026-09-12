import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { shapes } from '../../data/shapes';
import ProtectedImage from '../ui/ProtectedImage';

function Arrow({ dir, onClick, visible, label }) {
  if (!visible) return null;
  const left = dir === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shape-arrow"
      style={left ? { left: 0 } : { right: 0 }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
        style={{ transform: left ? 'none' : 'scaleX(-1)' }}
      >
        <path d="M14 4l-7 7 7 7" />
      </svg>
    </button>
  );
}

export default function ShopByShape() {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: (dir === 'left' ? -1 : 1) * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="bg-white" style={{ padding: '30px 0' }}>
      <div className="shape-container">
        <h2 className="shape-title">
          Shop By Shape
        </h2>

        <div className="shape-viewport">
          <Arrow dir="left" label="Scroll shapes left" visible={canLeft} onClick={() => scroll('left')} />
          <div className="shape-row scrollbar-hide" ref={rowRef} onScroll={updateEdges}>
          <div className="shape-track">
          {shapes.map((shape) => (
            <Link
              key={shape.slug}
              to={`/collections/${shape.slug}`}
              className="shape-item group"
            >
              <div className="shape-image-wrapper">
                <ProtectedImage
                  src={shape.image}
                  alt={shape.name}
                  loading="lazy"
                  className="w-full h-full object-contain"
                  onLoad={updateEdges}
                />
              </div>
              <p className="shape-name">
                {shape.name}
              </p>
            </Link>
          ))}
          </div>
          </div>
          <Arrow dir="right" label="Scroll shapes right" visible={canRight} onClick={() => scroll('right')} />
        </div>
      </div>
      <style>{`
        .shape-container { max-width: 1340px; margin: 0 auto; padding: 0 20px; }
        .shape-title {
          font-size: 20px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase;
          color: #000; font-family: var(--font-heading); margin: 0 0 30px; text-align: center;
        }
        .shape-viewport { position: relative; }
        .shape-row { overflow-x: auto; }
        .shape-track { display: flex; gap: 60px; width: max-content; margin: 0 auto; padding: 0 10px; }
        .shape-arrow {
          position: absolute; top: 42px; z-index: 2;
          width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          background: #fff; color: #222; border: 1px solid #ededed; border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08); cursor: pointer;
        }
        .shape-arrow:hover { opacity: 0.7; }
        .shape-item { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; text-decoration: none; transition: transform .3s ease; }
        .shape-item:hover { transform: translateY(-5px); }
        .shape-image-wrapper { width: 85px; height: 85px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; }
        .shape-name {
          font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: #3a3a3a; font-family: var(--font-shape-name); text-align: center; transition: color .3s ease;
        }
        .shape-item:hover .shape-name { color: #000; }
        @media (max-width: 989px) {
          .shape-track { gap: 40px; }
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
