import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { Truck, ShieldCheck, Gem } from 'lucide-react';

const testimonials = [
  { name: 'Rakesh Mehta', location: 'India', text: 'Absolutely stunning craftsmanship. The diamond sparkles beyond expectation and the setting is flawless.' },
  { name: 'John Miller', location: 'UK', text: 'From selection to delivery, everything was seamless. Certified, beautiful, and exactly as pictured.' },
  { name: 'Jason', location: 'New York', text: 'She said yes! The ring is perfect — brilliant, elegant, and clearly made with care.' },
  { name: 'Leo Adams', location: 'California', text: 'Transparent pricing and a certified diamond. I compared everywhere — Mitva was the best value.' },
  { name: 'N. Harris', location: 'Texas', text: 'The hidden halo catches light from every angle. Customer service helped me pick the perfect size.' },
  { name: 'M. Reed', location: 'Seattle', text: 'Insured shipping arrived quickly and safely. The ring looks even better in person.' },
];

function formatPrice(value) {
  return `$${value.toFixed(2)} USD`;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug);
  const { addItem } = useCart();

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedKt, setSelectedKt] = useState('14KT');
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
  const basePrice = currentVariant?.price || product.price;
  const ktDelta = selectedKt === '18KT' ? (product.kt18Delta || 200) : 0;
  const currentPrice = basePrice + ktDelta;

  const handleAddToCart = () => {
    addItem(
      product,
      currentVariant ? { ...currentVariant, kt: selectedKt, price: currentPrice } : null,
      quantity
    );
  };

  return (
    <>
      <section className="py-8 md:py-12">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="text-[13px] text-gray-500 mb-6 md:mb-10">
            <Link to="/" className="hover:text-[#222]">Home</Link>
            <span className="mx-2">/</span>
            <Link to={`/collections/${product.category}`} className="hover:text-[#222] capitalize">
              {product.category.replace(/-/g, ' ')}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#222]">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Images */}
            <div>
              <div className="aspect-square bg-[#f7f2ef] overflow-hidden mb-4">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 md:w-20 md:h-20 bg-[#f7f2ef] overflow-hidden border transition-colors ${
                      selectedImage === i ? 'border-[#222]' : 'border-[#ededed]'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info — matches mitvajewels.com PDP order */}
            <div>
              <h1
                className="font-heading mb-3"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '1px', lineHeight: 1.25 }}
              >
                {product.name}
              </h1>

              <p className="text-lg font-medium mb-2">
                {formatPrice(currentPrice)}
              </p>

              <p className="text-[13px] text-gray-500 uppercase mb-6" style={{ letterSpacing: '1px' }}>
                Setting Only — Center Diamond Not Included
              </p>

              {/* KT Selector */}
              <div className="mb-5">
                <p className="text-[13px] font-medium mb-3">
                  KT: <span className="text-gray-600 font-normal">{selectedKt}</span>
                </p>
                <div className="flex gap-2">
                  {['14KT', '18KT'].map((kt) => (
                    <button
                      key={kt}
                      onClick={() => setSelectedKt(kt)}
                      className={`px-5 transition-all text-[13px] font-medium uppercase ${
                        selectedKt === kt
                          ? 'bg-[#222] text-white border border-[#222]'
                          : 'bg-white text-[#222] border border-[#d9d9d9] hover:border-[#222]'
                      }`}
                      style={{ height: '44px', letterSpacing: '1px' }}
                    >
                      {kt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-6">
                  <p className="text-[13px] font-medium mb-3">
                    Color:{' '}
                    <span className="text-gray-600 font-normal">
                      {product.variants[selectedVariant].material || product.variants[selectedVariant].name}
                    </span>
                  </p>
                  <div className="flex gap-3">
                    {product.variants.map((variant, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedVariant(i)}
                        className="w-9 h-9 rounded-full transition-all"
                        style={{
                          backgroundColor: variant.color,
                          outline: selectedVariant === i ? '2px solid #222' : '1px solid #d1d5db',
                          outlineOffset: '2px',
                        }}
                        title={variant.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Choose your diamond */}
              <Link
                to="/pages/diamond"
                className="btn btn--secondary w-full mb-4"
              >
                <Gem size={15} strokeWidth={1.5} className="mr-2" />
                Choose your diamond
              </Link>

              {/* Quantity */}
              <div className="mb-4">
                <p className="text-[13px] font-medium mb-3">Quantity</p>
                <div className="inline-flex items-center border border-[#ededed]" style={{ height: '46px' }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 hover:bg-gray-50 h-full text-lg"
                  >
                    −
                  </button>
                  <span className="px-4 text-sm font-medium min-w-[40px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 hover:bg-gray-50 h-full text-lg"
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
              <button className="btn btn--secondary w-full mb-6">
                Buy it now
              </button>

              {/* Cert + shipping lines (reference PDP) */}
              <div className="space-y-2.5 mb-8">
                <div className="flex items-center gap-3 text-[13px] text-gray-600">
                  <ShieldCheck size={16} strokeWidth={1.5} />
                  <span>Certified by GIA/IGI/SHC</span>
                </div>
                <div className="flex items-center gap-3 text-[13px] text-gray-600">
                  <Truck size={16} strokeWidth={1.5} />
                  <span>Free Worldwide Shipping Over $1,000</span>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-gray-600 mb-6 leading-relaxed text-[15px]">
                  {product.description}
                </p>
              )}

              {/* Price Note + Details table (reference PDP) */}
              <div className="border-t border-[#ededed] pt-6 mb-8">
                <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
                  Price Note: Setting price shown. Final price depends on your selected diamond, KT and color.
                </p>
                <table className="w-full text-[14px]">
                  <tbody>
                    {product.style && (
                      <tr className="border-b border-[#ededed]">
                        <td className="py-3 pr-4 text-gray-500 w-1/2">Style</td>
                        <td className="py-3 font-medium">{product.style}</td>
                      </tr>
                    )}
                    <tr className="border-b border-[#ededed]">
                      <td className="py-3 pr-4 text-gray-500">Certified Side Stone</td>
                      <td className="py-3 font-medium">No</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 text-gray-500">Delivery Period</td>
                      <td className="py-3 font-medium">Within 30 Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customize CTA (reference PDP) */}
      <section className="bg-[#f7f2ef]" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
        <div className="container text-center max-w-2xl mx-auto">
          <h2 className="font-heading mb-4" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', letterSpacing: '1px', lineHeight: 1.3 }}>
            Design your dream ring, your way
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed text-[15px]">
            Choose the shape, diamond, and metal — we&apos;ll handcraft and ship it certified, anywhere in the world.
          </p>
          <Link to="/pages/diamond" className="btn btn--primary">
            Customize now
          </Link>
        </div>
      </section>

      {/* Diamond expert advisor (reference PDP) */}
      <section className="bg-white section-padding-lg">
        <div className="container max-w-3xl mx-auto text-center">
          <p className="text-subheading mb-3">Need Help?</p>
          <h2 className="font-heading mb-4" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', letterSpacing: '1px' }}>
            Talk to a Diamond Expert
          </h2>
          <p className="text-gray-600 mb-4 leading-relaxed text-[15px]">
            Buying an engagement ring is a big decision. Our diamond experts are here to help. Get free 1-on-1 advice on:
          </p>
          <ul className="text-gray-600 text-[15px] mb-6 space-y-1.5">
            <li>Choosing the perfect diamond</li>
            <li>Selecting your setting and metal</li>
            <li>Custom design ideas</li>
          </ul>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-[14px]">
            <a
              href="https://wa.me/971586062080"
              target="_blank"
              rel="noreferrer"
              className="btn btn--primary"
            >
              WhatsApp: +971 58 606 2080
            </a>
            <a href="mailto:sales@mitvajewels.com" className="btn btn--secondary">
              Email: sales@mitvajewels.com
            </a>
          </div>
          <p className="text-[13px] text-gray-500 mt-4">We reply within 24 hours. WhatsApp is fastest.</p>
        </div>
      </section>

      {/* Reviews (reference PDP) */}
      <section className="bg-white border-t border-[#ededed] section-padding-lg" style={{ paddingTop: '60px' }}>
        <div className="container">
          <div className="section-header">
            <p className="text-subheading mb-3">Reviews</p>
            <h2 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', letterSpacing: '1px' }}>
              What Our Clients Say
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="border border-[#ededed] p-6 bg-white">
                <div className="flex gap-0.5 mb-3 text-[#222]" aria-label="5 star review">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ fontSize: '14px' }}>★</span>
                  ))}
                </div>
                <p className="text-[14px] text-gray-600 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <p className="text-[13px] font-medium">
                  {t.name} <span className="text-gray-400 font-normal">— {t.location}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mitva Standard closing banner (reference PDP) */}
      <section className="bg-[#222] text-white" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div className="container text-center max-w-2xl mx-auto">
          <p className="mb-3" style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.7)' }}>
            The Mitva Standard
          </p>
          <h2 className="font-heading mb-4" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '1px', lineHeight: 1.25 }}>
            From selection to setting, every detail is handled at the source
          </h2>
          <p className="leading-relaxed" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)' }}>
            Certified diamonds. Transparent pricing. Crafted with intention.
          </p>
        </div>
      </section>
    </>
  );
}
