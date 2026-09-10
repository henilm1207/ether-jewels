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
      {/* Image */}
      <div className="relative aspect-square bg-[#f7f2ef] overflow-hidden mb-3">
        <img
          src={hovered && product.images[1] ? product.images[1] : product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge */}
        {product.badge && (
          <span
            className={`absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
              product.badge === 'sale'
                ? 'bg-[#ec635e]'
                : product.badge === 'new'
                ? 'bg-[#70c5d8]'
                : 'bg-[#222]'
            }`}
          >
            {product.badge}
          </span>
        )}

        {/* Choose Options Button on hover */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="btn btn--white w-full text-center">
            Choose options
          </div>
        </div>
      </div>

      {/* Info - product card title uses heading font */}
      <h3
        className="mb-1 group-hover:opacity-70 transition-opacity leading-snug"
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
      <p className="text-[14px]">
        {product.compareAtPrice && (
          <span className="line-through text-gray-400 mr-2">
            ${product.compareAtPrice.toFixed(2)}
          </span>
        )}
        <span className="font-medium">
          From ${product.price.toFixed(2)} USD
        </span>
      </p>
    </Link>
  );
}
