import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProtectedImage from '../ui/ProtectedImage';
import FavButton from '../ui/FavButton';

export default function ProductCard({ product, priority = false }) {
  const [hovered, setHovered] = useState(false);

  // Live: "From $1,500.00 USD" — always From + thousands separator + 2 decimals + USD
  const fmt = (v) =>
    `From $${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block text-left"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — live: transparent bg, square, 1.2s crossfade, 2nd img desktop-only */}
      <div className="relative aspect-square bg-transparent overflow-hidden">
        <ProtectedImage
          src={product.images[0]}
          alt={product.name}
          watermark
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: hovered && product.images[1] ? 0 : 1 }}
        />
        {product.images[1] && (
          <ProtectedImage
            src={product.images[1]}
            alt=""
            watermark
            loading="lazy"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-out hidden md:block"
            style={{ opacity: hovered ? 1 : 0 }}
          />
        )}

        {/* Live: no badges on collection cards */}

        {/* Choose Options — live: always visible mobile, 540ms rise on desktop hover */}
        <div
          className="absolute transition-all duration-[540ms] ease-[cubic-bezier(.4,0,.2,1)] opacity-100 translate-y-0 md:opacity-0 md:translate-y-[15px] md:group-hover:opacity-100 md:group-hover:translate-y-0"
          style={{
            left: '15px',
            right: '15px',
            bottom: '15px',
            width: 'calc(100% - 30px)',
          }}
        >
          <div className="btn btn--white product-card-choose w-full text-center" style={{ padding: '0 15px', height: '46px' }}>
            <span className="product-card-choose__text">Choose options</span>
          </div>
        </div>
      </div>

      {/* Info — live: left aligned, 12px indent, title 15px mb 4px, uniform price */}
      <div style={{ marginTop: '20px', paddingInlineStart: '12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <h3
            className="product-card-title leading-snug"
            style={{ margin: '0 0 4px' }}
          >
            {product.name}
          </h3>
          <p style={{ fontSize: '15px', lineHeight: 1.5, color: '#222' }}>
            {product.compareAtPrice && (
              <span className="line-through text-gray-400 mr-2">
                ${Number(product.compareAtPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            {fmt(product.price)}
          </p>
        </div>
        {/* Favorite — docked in info row, never overlaps imagery, never navigates */}
        <FavButton
          product={product}
          size={18}
          className="shrink-0"
        />
      </div>
    </Link>
  );
}
