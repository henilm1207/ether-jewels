import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block text-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — live: square, stacked crossfade, actions inset 15px */}
      <div className="relative aspect-square bg-[#f7f2ef] overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: hovered && product.images[1] ? 0 : 1 }}
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt=""
            loading="lazy"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: hovered ? 1 : 0 }}
          />
        )}

        {/* Badge — live: 10px offset */}
        {product.badge && (
          <span
            className={`absolute px-2 py-1 text-[10px] font-medium uppercase text-white ${
              product.badge === 'sale'
                ? 'bg-[#ec635e]'
                : product.badge === 'new'
                ? 'bg-[#70c5d8]'
                : 'bg-[#222]'
            }`}
            style={{ left: '10px', top: '10px', letterSpacing: '1px' }}
          >
            {product.badge}
          </span>
        )}

        {/* Choose Options — floating bar, rises 15px + fades */}
        <div
          className="absolute transition-all duration-300"
          style={{
            left: '15px',
            right: '15px',
            bottom: '15px',
            transform: hovered ? 'translateY(0)' : 'translateY(15px)',
            opacity: hovered ? 1 : 0,
          }}
        >
          <div className="btn btn--white w-full text-center" style={{ padding: '0 15px' }}>
            Choose options
          </div>
        </div>
      </div>

      {/* Info — live: margin-top 20px, title 15px mb 4px, price 15px lh 1.5 */}
      <div className="px-1" style={{ marginTop: '20px' }}>
        <h3
          className="product-card-title group-hover:opacity-70 transition-opacity leading-snug"
          style={{ margin: '0 0 4px' }}
        >
          {product.name}
        </h3>
        <p className="text-[#222]" style={{ fontSize: '15px', lineHeight: 1.5 }}>
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
        {/* Variant swatches — live shows 24px dots on cards */}
        {product.variants && product.variants.length > 1 && (
          <div className="flex items-center justify-center" style={{ gap: '8px', marginTop: '8px' }}>
            {product.variants.map((v, i) => (
              <span
                key={i}
                className="rounded-full inline-block"
                title={v.name}
                style={{ width: '24px', height: '24px', backgroundColor: v.color, border: '1px solid #ededed' }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
