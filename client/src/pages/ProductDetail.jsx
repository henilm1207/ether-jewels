import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiUrl, MAX_CART_QTY } from '../config';
import { metalColor } from '../lib/metals';
import FavButton from '../components/ui/FavButton';
import ProtectedImage from '../components/ui/ProtectedImage';
import ProductReviews from '../components/product/ProductReviews';
import ProductAccordions from '../components/product/ProductAccordions';
import { useBag } from '../context/BagContext';
import { Truck, ShieldCheck } from 'lucide-react';

function formatPrice(value) {
  return `$${value.toFixed(2)} USD`;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { addItem } = useBag();

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedKt, setSelectedKt] = useState('14KT');
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const carouselRef = useRef(null);

  useEffect(() => {
    setSelectedVariant(0);
    setSelectedKt('14KT');
    setSelectedImage(0);
    setSelectedSize(null);
    setSizeError('');
    setQuantity(1);
    setLoading(true);
    setLoadError('');
    setProduct(null);
    let live = true;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/products/${encodeURIComponent(slug)}`));
        if (res.status === 404) {
          if (live) setProduct(null);
          return;
        }
        if (!res.ok) throw new Error('Could not load this product.');
        const data = await res.json();
        if (live) {
          setProduct(data);
          setSelectedSize(data.defaultSize || null);
          // Start the gallery on variant 0's metal photo when assigned.
          const firstImg = data.variants?.[0]?.image;
          const k = firstImg ? (data.images || []).indexOf(firstImg) : -1;
          if (k >= 0) setSelectedImage(k + (data.video ? 1 : 0));
        }
      } catch (e) {
        if (live) setLoadError(e.message || 'Could not load this product.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-20" aria-hidden="true">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#f1ece8] aspect-square" />
          <div>
            <div className="bg-[#f1ece8]" style={{ height: '28px', width: '70%' }} />
            <div className="bg-[#f1ece8]" style={{ height: '16px', width: '40%', marginTop: '12px' }} />
            <div className="bg-[#f1ece8]" style={{ height: '46px', width: '200px', marginTop: '24px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl mb-4">Could not load product</h1>
        <p className="text-gray-600 text-[15px]" style={{ marginBottom: '16px' }}>{loadError}</p>
        <button onClick={() => window.location.reload()} className="btn btn--secondary">Retry</button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-heading text-2xl mb-4">Product not found</h1>
        <Link to="/" className="text-sm underline">Return to home</Link>
      </div>
    );
  }

  const currentVariant = product.variants?.[selectedVariant] || null;
  const basePrice = Number(currentVariant?.price ?? product.price) || 0;
  const KT_DELTA = { '10KT': Number(product.kt10Delta ?? -100), '18KT': Number(product.kt18Delta ?? 200) };
  const ktDelta = KT_DELTA[selectedKt] || 0;
  const currentPrice = basePrice + ktDelta;
  // Ring categories carry sizes[]; the server rejects ring orders without one.
  const needsSize = (product.sizes || []).length > 0;

  const buildSelection = () => {
    if (needsSize && !selectedSize) {
      setSizeError('Please select a ring size.');
      return null;
    }
    setSizeError('');
    return {
      variant: currentVariant ? { ...currentVariant, kt: selectedKt, price: currentPrice } : null,
      size: needsSize ? selectedSize : undefined,
    };
  };

  const oos = currentVariant && currentVariant.inStock === false;

  // Whole-cart cap: a refused add means 6+ total units — bulk inquiry.
  const goBulk = () => navigate('/pages/contact', { state: { bulk: true } });

  const handleAddToCart = () => {
    if (oos) return; // message already shown under the swatches; server rejects too
    const sel = buildSelection();
    if (!sel) return;
    if (!addItem(product, sel.variant, quantity, sel.size)) goBulk();
  };

  const handleBuyNow = () => {
    if (oos) return;
    const sel = buildSelection();
    if (!sel) return;
    if (!addItem(product, sel.variant, quantity, sel.size)) {
      goBulk();
      return;
    }
    navigate('/cart', { state: { checkout: true } });
  };

  // Gallery media: optional admin-side video first, then images (supports N images)
  const medias = [
    ...(product.video ? [{ type: 'video', src: product.video }] : []),
    ...product.images.map((src) => ({ type: 'image', src })),
  ];

  // Metal → gallery: index in `medias` of a variant's assigned photo, or -1
  // when unassigned (gallery stays put — pre-change products unaffected).
  const mediaIndexForVariant = (vi) => {
    const img = product.variants?.[vi]?.image;
    if (!img) return -1;
    const k = product.images.indexOf(img);
    return k === -1 ? -1 : k + (product.video ? 1 : 0);
  };

  const selectMedia = (i) => {
    setSelectedImage(i);
    const el = carouselRef.current;
    if (el && el.children[i]) {
      el.children[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const selectVariant = (i) => {
    setSelectedVariant(i);
    const mi = mediaIndexForVariant(i);
    if (mi >= 0) selectMedia(mi);
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

          <div className="pdp-grid mb-10">
            {/* Gallery — live: 61.8575% media, thumb row under main (6-up/4-up) */}
            <div className="pdp-media">
              {/* Desktop main */}
              <div className="hidden md:block aspect-square bg-[#f7f2ef] overflow-hidden">
                {medias[selectedImage]?.type === 'video' ? (
                  <video src={medias[selectedImage].src} controls className="w-full h-full object-cover" />
                ) : (
                  <ProtectedImage
                    src={medias[selectedImage]?.src}
                    alt={product.name}
                    watermark
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
                        <ProtectedImage src={m.src} alt={i === 0 ? product.name : ''} watermark className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
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
                      <ProtectedImage src={m.src} alt="" watermark loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Info — live block rhythm 24px (20 mobile) */}
            <div className="pdp-info">
              <div className="flex items-start justify-between" style={{ gap: '12px', marginBottom: '16px' }}>
                <h1
                  className="font-heading"
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.25, marginBottom: 0 }}
                >
                  {product.name}
                </h1>
                <FavButton product={product} size={20} className="flex-shrink-0 shadow-none border border-[#ededed]" />
              </div>

              <p className="font-medium" style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: '8px' }}>
                {formatPrice(currentPrice)}
              </p>

              <p className="text-[13px] text-gray-500" style={{ marginBottom: '24px' }}>
                Tax included.
              </p>

              {/* KT Selector — live option buttons 46px, 12px gaps */}
              <div style={{ marginBottom: '24px' }}>
                <p className="text-[15px]" style={{ lineHeight: '24px', marginBottom: '12px' }}>
                  <span className="font-medium">KT:</span>{' '}
                  <span className="text-gray-600">{selectedKt}</span>
                </p>
                <div className="flex" style={{ gap: '12px' }}>
                  {['10KT', '14KT', '18KT'].map((kt) => (
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
                          onClick={() => selectVariant(i)}
                          disabled={variant.inStock === false}
                          className="pdp-swatch rounded-full transition-all block disabled:cursor-not-allowed"
                          style={{
                            // Static map fallback covers pre-change products / custom metals.
                            backgroundColor: variant.color || metalColor(variant.material || variant.name),
                            outline: selectedVariant === i ? '2px solid #222' : '1px solid #d1d5db',
                            outlineOffset: '2px',
                            opacity: variant.inStock === false ? 0.3 : 1,
                          }}
                          title={`${variant.material || variant.name}${variant.inStock === false ? ' (out of stock)' : ''}`}
                          aria-label={`${variant.material || variant.name}${variant.inStock === false ? ', out of stock' : ''}`}
                          aria-disabled={variant.inStock === false}
                        />
                        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#222] text-white text-[11px] px-2 py-1 opacity-0 group-hover/swatch:opacity-100 transition-opacity">
                          {variant.material || variant.name}{variant.inStock === false ? ' — out of stock' : ''}
                        </span>
                      </span>
                    ))}
                  </div>
                  {currentVariant && currentVariant.inStock === false && (
                    <p role="alert" className="text-sm text-red-700 mt-2">This metal is currently out of stock — please pick another.</p>
                  )}
                </div>
              )}

              {/* Ring size — required for ring categories (server rejects without) */}
              {needsSize && (
                <div style={{ marginBottom: '24px' }}>
                  <p className="text-[15px]" style={{ lineHeight: '24px', marginBottom: '12px' }}>
                    <span className="font-medium">Ring size:</span>{' '}
                    <span className="text-gray-600">{selectedSize || 'Select a size'}</span>
                  </p>
                  <div className="flex flex-wrap" style={{ gap: '12px' }} role="group" aria-label="Ring size">
                    {[...(product.sizes || [])].sort((a, b) => parseFloat(a) - parseFloat(b)).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setSelectedSize(s); setSizeError(''); }}
                        aria-pressed={selectedSize === s}
                        className={`transition-all text-[13px] font-medium ${
                          selectedSize === s
                            ? 'bg-[#222] text-white border border-[#222]'
                            : 'bg-white text-[#222] border hover:border-[#222]'
                        }`}
                        style={{ minWidth: '52px', minHeight: '46px', padding: '8px 14px', borderColor: selectedSize === s ? '#222' : '#ededed', letterSpacing: '1px' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {sizeError && <p role="alert" className="text-sm text-red-700 mt-2">{sizeError}</p>}
                </div>
              )}

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
                    onClick={() => setQuantity(Math.min(MAX_CART_QTY, quantity + 1))}
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
                  disabled={oos}
                  className="btn btn--primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to cart
                </button>
                <button onClick={handleBuyNow} disabled={oos} className="btn btn--secondary w-full disabled:opacity-50 disabled:cursor-not-allowed">
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

              {/* Info accordions: description + spec table, bespoke, experts */}
              <ProductAccordions product={product} />
            </div>
          </div>
        </div>
      </section>

      {/* Live customer reviews (approved only) + login-gated review form */}
      <ProductReviews product={product} />

      {/* Etherstar Standard closing banner */}
      <section className="bg-[#1A1A1A] text-white" style={{ paddingTop: '96px', paddingBottom: '96px', marginBottom: '80px' }}>
        <div className="container text-center max-w-2xl mx-auto">
          <p className="mb-3" style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.7)' }}>
            The Etherstar Standard
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
