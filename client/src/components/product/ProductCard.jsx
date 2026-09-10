import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — live: #F6F1EE, 1/1.15 ratio, contain + padding so ring heads never crop */}
      <div className="relative aspect-[1/1.15] bg-[#F6F1EE] overflow-hidden mb-4 p-3">
        <img
          src={hovered && product.images[1] ? product.images[1] : product.images[0]}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Badge */}
        {product.badge && (
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-medium uppercase text-white ${
              product.badge === 'sale'
                ? 'bg-[#ec635e]'
                : product.badge === 'new'
                ? 'bg-[#70c5d8]'
                : 'bg-[#222]'
            }`}
            style={{ letterSpacing: '1px' }}
          >
            {product.badge}
          </span>
        )}

        {/* Choose Options — slides up from bottom with blur, like live */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-transform duration-300 ease-out ${
            hovered ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="btn btn--white w-full text-center bg-white/90 backdrop-blur">
            Choose options
          </div>
        </div>
      </div>

      {/* Info — Prestige centers product info */}
      <div className="text-center px-1">
        <h3
          className="mb-1.5 group-hover:opacity-70 transition-opacity leading-snug"
          style={{
            fontSize: '15px',
            fontFamily: "'Playfair Display', serif",
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: '0',
          }}
        >
          {product.name}
        </h3>
        <p className="text-[14px] text-[#222]">
          {product.compareAtPrice && (
            <span className="line-through text-gray-400 mr-2">
              ${product.compareAtPrice.toFixed(2)}
            </span>
          )}
          <span className="text-gray-500 font-normal">From </span>
          <span className="font-medium">
            ${product.price.toFixed(2)} USD
          </span>
        </p>
      </div>
    </Link>
  );
}
