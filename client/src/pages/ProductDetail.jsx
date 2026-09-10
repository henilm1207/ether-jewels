import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { Truck, Shield, RotateCcw } from 'lucide-react';

export default function ProductDetail() {
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug);
  const { addItem } = useCart();

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl mb-4">Product not found</h1>
        <Link to="/" className="text-sm underline">Return to home</Link>
      </div>
    );
  }

  const currentVariant = product.variants?.[selectedVariant] || null;
  const currentPrice = currentVariant?.price || product.price;

  const handleAddToCart = () => {
    addItem(product, currentVariant, quantity);
  };

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="text-[13px] text-gray-500 mb-6 md:mb-8">
          <Link to="/" className="hover:text-[#222]">Home</Link>
          <span className="mx-2">/</span>
          <Link to={`/collections/${product.category}`} className="hover:text-[#222] capitalize">
            {product.category.replace(/-/g, ' ')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#222]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-[#f7f2ef] overflow-hidden mb-4">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 md:w-20 md:h-20 bg-[#f7f2ef] overflow-hidden border-2 transition-colors ${
                    selectedImage === i ? 'border-[#222]' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <h1
              className="font-heading mb-3"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '1px' }}
            >
              {product.name}
            </h1>

            <p className="text-lg font-medium mb-6">
              ${currentPrice.toFixed(2)} USD
            </p>

            {product.description && (
              <p className="text-gray-600 mb-6 leading-relaxed text-[15px]">
                {product.description}
              </p>
            )}

            {/* Variant Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <p className="text-[13px] font-medium mb-3">
                  {product.variants[0].material ? 'Material' : 'Option'}:{' '}
                  <span className="text-gray-600">
                    {product.variants[selectedVariant].name}
                  </span>
                </p>
                <div className="flex gap-2">
                  {product.variants.map((variant, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedVariant(i)}
                      className="w-9 h-9 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: variant.color,
                        borderColor: selectedVariant === i ? '#222' : '#d1d5db',
                        transform: selectedVariant === i ? 'scale(1.1)' : 'scale(1)',
                      }}
                      title={variant.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-[13px] font-medium mb-3">Quantity</p>
              <div className="inline-flex items-center border border-[#ededed]" style={{ height: '46px' }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 hover:bg-gray-50 h-full"
                >
                  −
                </button>
                <span className="px-4 text-sm font-medium min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 hover:bg-gray-50 h-full"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              className="btn btn--primary w-full mb-3"
            >
              Add to cart
            </button>

            {/* Buy Now */}
            <button className="btn btn--secondary w-full mb-8">
              Buy it now
            </button>

            {/* Trust Features */}
            <div className="border-t border-[#ededed] pt-6 space-y-3">
              <div className="flex items-center gap-3 text-[13px] text-gray-600">
                <Truck size={16} strokeWidth={1.5} />
                <span>Free shipping on orders over $1,000</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-gray-600">
                <Shield size={16} strokeWidth={1.5} />
                <span>Insured shipping, covered door to door</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-gray-600">
                <RotateCcw size={16} strokeWidth={1.5} />
                <span>30-day return policy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
