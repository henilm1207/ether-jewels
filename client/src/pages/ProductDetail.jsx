import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { findProduct } from '../data/products';
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
  const product = findProduct(slug);
  const { addItem } = useCart();

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedKt, setSelectedKt] = useState('14KT');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const carouselRef = useRef(null);

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

  // Gallery media: optional admin-side video first, then images (supports N images)
  const medias = [
    ...(product.video ? [{ type: 'video', src: product.video }] : []),
    ...product.images.map((src) => ({ type: 'image', src })),
  ];

  const selectMedia = (i) => {
    setSelectedImage(i);
    const el = carouselRef.current;
    if (el && el.children[i]) {
      el.children[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const onCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || !el.children.length) return;
    const w = el.children[0].getBoundingClientRect().width || 1;
    const i = Math.round(el.scrollLeft / w);
    if (i !== selectedImage && i >= 0 && i < medias.length) setSelectedImage(i);
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

          <div className="pdp-grid">
            {/* Gallery — live: 61.8575% media, thumb row under main (6-up/4-up) */}
            <div className="pdp-media">
              {/* Desktop main */}
              <div className="hidden md:block aspect-square bg-[#f7f2ef] overflow-hidden">
                {medias[selectedImage]?.type === 'video' ? (
                  <video src={medias[selectedImage].src} controls className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={medias[selectedImage]?.src}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {/* Mobile swipe carousel — 77% peep */}
              <div
                ref={carouselRef}
                onScroll={onCarouselScroll}
                className="md:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-[15px] px-[15px]"
              >
                {medias.map((m, i) => (
                  <div key={i} className="snap-center flex-shrink-0" style={{ width: '77%', marginRight: '12px' }}>
                    <div className="aspect-square bg-[#f7f2ef] overflow-hidden">
                      {m.type === 'video' ? (
                        <video src={m.src} controls playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.src} alt={i === 0 ? product.name : ''} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Thumb row */}
              <div className="grid grid-cols-4 lg:grid-cols-6 gap-2" style={{ marginTop: '12px' }}>
                {medias.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => selectMedia(i)}
                    aria-label={`View image ${i + 1}`}
                    className="aspect-square bg-[#f7f2ef] overflow-hidden transition-colors"
                    style={{ border: selectedImage === i ? '1px solid #222' : '1px solid transparent' }}
                  >
                    {m.type === 'video' ? (
                      <video src={m.src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.src} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Info — live block rhythm 24px (20 mobile) */}
            <div className="pdp-info">
              <h1
                className="font-heading"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.25, marginBottom: '16px' }}
              >
                {product.name}
              </h1>

              <p className="font-medium" style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: '8px' }}>
                {formatPrice(currentPrice)}
              </p>

              <p className="text-[13px] text-gray-500 uppercase" style={{ letterSpacing: '1px', marginBottom: '24px' }}>
                Setting Only — Center Diamond Not Included
              </p>

              {/* KT Selector — live option buttons 46px, 12px gaps */}
              <div style={{ marginBottom: '24px' }}>
                <p className="text-[15px]" style={{ lineHeight: '24px', marginBottom: '12px' }}>
                  <span className="font-medium">KT:</span>{' '}
                  <span className="text-gray-600">{selectedKt}</span>
                </p>
                <div className="flex" style={{ gap: '12px' }}>
                  {['14KT', '18KT'].map((kt) => (
                    <button
                      key={kt}
                      onClick={() => setSelectedKt(kt)}
                      className={`transition-all text-[13px] font-medium uppercase ${
                        selectedKt === kt
                          ? 'bg-[#222] text-white border border-[#222]'
                          : 'bg-white text-[#222] border hover:border-[#222]'
                      }`}
                      style={{ minWidth: '73px', minHeight: '46px', padding: '8px 14px', borderColor: selectedKt === kt ? '#222' : '#ededed', letterSpacing: '1px' }}
                    >
                      {kt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector — live swatches 36px (44px mobile) */}
              {product.variants && product.variants.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <p className="text-[15px]" style={{ lineHeight: '24px', marginBottom: '12px' }}>
                    <span className="font-medium">Color:</span>{' '}
                    <span className="text-gray-600">
                      {product.variants[selectedVariant].material || product.variants[selectedVariant].name}
                    </span>
                  </p>
                  <div className="flex" style={{ gap: '12px' }}>
                    {product.variants.map((variant, i) => (
                      <span key={i} className="relative group/swatch">
                        <button
                          onClick={() => setSelectedVariant(i)}
                          className="pdp-swatch rounded-full transition-all block"
                          style={{
                            backgroundColor: variant.color,
                            outline: selectedVariant === i ? '2px solid #222' : '1px solid #d1d5db',
                            outlineOffset: '2px',
                          }}
                          title={variant.material || variant.name}
                          aria-label={variant.material || variant.name}
                        />
                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#222] text-white text-[11px] px-2 py-1 opacity-0 group-hover/swatch:opacity-100 transition-opacity">
                          {variant.material || variant.name}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Choose your diamond */}
              <Link
                to="/pages/diamond"
                className="btn btn--secondary w-full"
                style={{ marginBottom: '24px' }}
              >
                <Gem size={15} strokeWidth={1.5} className="mr-2" />
                Choose your diamond
              </Link>

              {/* Quantity */}
              <div style={{ marginBottom: '24px' }}>
                <p className="text-[15px]" style={{ lineHeight: '24px', marginBottom: '12px' }}>
                  <span className="font-medium">Quantity</span>
                </p>
                <div className="inline-flex items-center border border-[#ededed]" style={{ height: '46px' }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 hover:bg-gray-50 h-full text-lg"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="px-4 text-sm font-medium min-w-[40px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 hover:bg-gray-50 h-full text-lg"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Buy buttons — live: 40px top margin, 12px gap */}
              <div className="grid" style={{ gap: '12px', marginTop: '40px', marginBottom: '24px' }}>
                <button
                  onClick={handleAddToCart}
                  className="btn btn--primary w-full"
                >
                  Add to cart
                </button>
                <button className="btn btn--secondary w-full">
                  Buy it now
                </button>
              </div>

              {/* Sticky ATC — mobile only */}
              <div className="lg:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-[#ededed] py-3 px-1 mb-6 flex items-center gap-3">
                <span className="text-[15px] font-medium whitespace-nowrap">{formatPrice(currentPrice)}</span>
                <button onClick={handleAddToCart} className="btn btn--primary flex-1">
                  Add to cart
                </button>
              </div>

              {/* Cert + shipping lines */}
              <div className="space-y-2.5" style={{ marginBottom: '24px' }}>
                <div className="flex items-center gap-3 text-[15px] text-gray-600">
                  <ShieldCheck size={16} strokeWidth={1.5} />
                  <span>Certified by GIA/IGI/SHC</span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-600">
                  <Truck size={16} strokeWidth={1.5} />
                  <span>Free Worldwide Shipping Over $1,000</span>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-gray-600 leading-relaxed text-[15px]" style={{ marginBottom: '24px' }}>
                  {product.description}
                </p>
              )}

              {/* Price Note + Details table */}
              <div className="border-t border-[#ededed]" style={{ paddingTop: '24px' }}>
                <p className="text-[13px] text-gray-500 leading-relaxed" style={{ marginBottom: '16px' }}>
                  Price Note: Setting price shown. Final price depends on your selected diamond, KT and color.
                </p>
                <table className="w-full text-[15px]">
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
          <p className="section__subheading">Need Help?</p>
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
            <p className="section__subheading">Reviews</p>
            <h2 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', letterSpacing: '1px' }}>
              What Our Clients Say
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="border border-[#ededed] p-6 bg-white">
                <div className="flex gap-1 mb-3" role="img" aria-label="Rated 5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#222" aria-hidden="true">
                      <path d="M12 2l2.94 6.36 6.96.82-5.16 4.73 1.4 6.89L12 17.27 5.86 20.8l1.4-6.89L2.1 9.18l6.96-.82L12 2z" />
                    </svg>
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
      <section className="bg-[#1A1A1A] text-white" style={{ paddingTop: '96px', paddingBottom: '96px' }}>
        <div className="container text-center max-w-2xl mx-auto">
          <p className="mb-3" style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.7)' }}>
            The Mitva Standard
          </p>
          <h2 className="font-heading mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '1px', lineHeight: 1.2 }}>
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
