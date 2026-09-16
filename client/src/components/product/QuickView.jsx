import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiUrl } from '../../config';
import { metalColor } from '../../lib/metals';
import ProtectedImage from '../ui/ProtectedImage';

// Quick-view popup (mitvajewels-style): opened from the collection card's
// "Choose options" button. Fetches the full product on open so KT pricing,
// variant photos and grades are complete — the list payload stays lean.
// CTAs both continue into the funnel on the full details page;
// ring sizes stay on PDP/cart (server requires them only at checkout).
//
// Rendered via portal to document.body: card/grid ancestors use transforms
// (hover rise, fade-up), which would trap a fixed overlay to the products
// area — the portal keeps the dim full-viewport (header to footer).
export default function ProductQuickView({ slug, onClose }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [imageIdx, setImageIdx] = useState(0);
  const [selectedKt, setSelectedKt] = useState('14KT');
  const [selectedVariant, setSelectedVariant] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError('');
    setProduct(null);
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/products/${encodeURIComponent(slug)}`));
        if (!res.ok) throw new Error('Could not load this product.');
        const data = await res.json();
        if (live) setProduct(data);
      } catch (e) {
        if (live) setLoadError(e.message || 'Could not load this product.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const images = product ? product.images || [] : [];
  const go = (dir) => {
    if (!images.length) return;
    setImageIdx((i) => (i + dir + images.length) % images.length);
  };

  const selectVariant = (i) => {
    setSelectedVariant(i);
    const img = product?.variants?.[i]?.image;
    if (img) {
      const k = (product.images || []).indexOf(img);
      if (k >= 0) setImageIdx(k);
    }
  };

  const variant = product?.variants?.[selectedVariant] || null;
  const basePrice = Number(variant?.price ?? product?.price) || 0;
  const KT_DELTA = { '10KT': Number(product?.kt10Delta ?? -100), '18KT': Number(product?.kt18Delta ?? 200) };
  const price = basePrice + (KT_DELTA[selectedKt] || 0);
  const fmt = (v) =>
    `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  const colors = product && Array.isArray(product.diamondColors) ? product.diamondColors : [];
  const clarities = product && Array.isArray(product.clarity) ? product.clarity : [];
  const colorTxt = colors.length > 1 ? `${colors[0]}–${colors[colors.length - 1]}` : colors[0] || '';
  const specTxt = [colorTxt && `Color ${colorTxt}`, clarities[0] && `Clarity ${clarities[0]}`]
    .filter(Boolean)
    .join(' · ');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product ? `Quick view ${product.name}` : 'Quick view'}
      className="fixed inset-0 z-[999] flex items-end md:items-center justify-center animate-fade-in"
      style={{ paddingTop: '40px' }}
    >
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />
      <div
        className="relative bg-white w-full overflow-y-auto animate-fade-in-up z-10"
        style={{ maxWidth: '900px', width: 'min(900px, 94vw)', maxHeight: '90vh' }}
      >
        <button
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute z-10 bg-white rounded-full flex items-center justify-center hover:opacity-70"
          style={{ width: '36px', height: '36px', top: '12px', right: '12px' }}
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse" style={{ padding: '32px' }}>
            <div className="bg-[#f1ece8] aspect-square" />
            <div>
              <div className="bg-[#f1ece8]" style={{ height: '28px', width: '80%', marginBottom: '12px' }} />
              <div className="bg-[#f1ece8]" style={{ height: '16px', width: '40%', marginBottom: '24px' }} />
              <div className="bg-[#f1ece8]" style={{ height: '46px', width: '160px', marginBottom: '16px' }} />
              <div className="bg-[#f1ece8]" style={{ height: '46px', width: '100%' }} />
            </div>
          </div>
        ) : loadError || !product ? (
          <div className="text-center" style={{ padding: '48px 32px' }}>
            <p className="text-[15px] text-gray-600" style={{ marginBottom: '16px' }}>
              {loadError || 'Could not load this product.'}
            </p>
            <Link to={`/products/${slug}`} onClick={onClose} className="btn btn--secondary">
              View full details
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '32px', padding: '32px' }}>
            {/* Gallery */}
            <div>
              <div className="relative aspect-square bg-[#f7f2ef] overflow-hidden">
                <ProtectedImage
                  src={images[imageIdx]}
                  alt={product.name}
                  watermark
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => go(-1)}
                      aria-label="Previous image"
                      className="absolute bg-white rounded-full flex items-center justify-center shadow hover:opacity-80"
                      style={{ width: '40px', height: '40px', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => go(1)}
                      aria-label="Next image"
                      className="absolute bg-white rounded-full flex items-center justify-center shadow hover:opacity-80"
                      style={{ width: '40px', height: '40px', right: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2" style={{ marginTop: '12px' }}>
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      onClick={() => setImageIdx(i)}
                      aria-label={`View image ${i + 1}`}
                      className="aspect-square bg-[#f7f2ef] overflow-hidden"
                      style={{ border: imageIdx === i ? '1px solid #222' : '1px solid transparent' }}
                    >
                      <ProtectedImage src={src} alt="" watermark loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <h2
                className="font-heading"
                style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', lineHeight: 1.3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}
              >
                {product.name}
              </h2>
              <p className="font-medium" style={{ fontSize: '16px', marginBottom: '4px' }}>
                {product.compareAtPrice && (
                  <span className="line-through text-gray-400 mr-2" style={{ fontWeight: 400 }}>
                    ${Number(product.compareAtPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {fmt(price)}
              </p>
              <p className="text-[13px] text-gray-500" style={{ marginBottom: '8px' }}>
                Tax included.
              </p>
              {specTxt && (
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>{specTxt}</p>
              )}

              {/* KT selector */}
              <div style={{ marginBottom: '20px' }}>
                <p className="text-[15px]" style={{ lineHeight: '24px', marginBottom: '10px' }}>
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

              {/* Color selector */}
              {product.variants && product.variants.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <p className="text-[15px]" style={{ lineHeight: '24px', marginBottom: '10px' }}>
                    <span className="font-medium">Color:</span>{' '}
                    <span className="text-gray-600">
                      {product.variants[selectedVariant].material || product.variants[selectedVariant].name}
                    </span>
                  </p>
                  <div className="flex" style={{ gap: '12px' }}>
                    {product.variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => selectVariant(i)}
                        disabled={v.inStock === false}
                        className="rounded-full transition-all block disabled:cursor-not-allowed"
                        style={{
                          width: '36px',
                          height: '36px',
                          backgroundColor: v.color || metalColor(v.material || v.name),
                          outline: selectedVariant === i ? '2px solid #222' : '1px solid #d1d5db',
                          outlineOffset: '2px',
                          opacity: v.inStock === false ? 0.3 : 1,
                        }}
                        title={`${v.material || v.name}${v.inStock === false ? ' (out of stock)' : ''}`}
                        aria-label={`${v.material || v.name}${v.inStock === false ? ', out of stock' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Link
                to={`/products/${product.slug}`}
                onClick={onClose}
                className="inline-block text-[13px] font-medium uppercase underline underline-offset-4"
                style={{ letterSpacing: '1px' }}
              >
                View Full Details →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
