import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { apiUrl } from '../config';
import { useWishlist } from '../context/WishlistContext';
import { useBag } from '../context/BagContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/product/ProductCard';

// /account/wishlist — the customer's favourites. Members render populated
// entries straight from the Wishlist collection; guests resolve their saved
// slugs one by one. Every row offers Move to bag (Myntra-style).
export default function Wishlist() {
  const { items, guestPairs, count, hydrating, moveFavToBag, toggleFav } = useWishlist();
  const { addItem } = useBag();
  const { token } = useAuth();
  const navigate = useNavigate();
  // Inside the signed-in account shell: drop the page chrome + big heading.
  const embedded = !!(useOutletContext() || {}).embedded;
  const [guestProducts, setGuestProducts] = useState([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [movingKey, setMovingKey] = useState('');
  const [moveError, setMoveError] = useState('');

  const memberProducts = items.map((e) => e.product).filter((p) => p && (p._id || p.id));

  useEffect(() => {
    if (token) {
      setGuestProducts([]);
      return;
    }
    let live = true;
    (async () => {
      const slugs = guestPairs.map((p) => p.slug).filter(Boolean);
      if (slugs.length === 0) {
        if (live) setGuestProducts([]);
        return;
      }
      setGuestLoading(true);
      try {
        const settled = await Promise.all(
          slugs.map((slug) =>
            fetch(apiUrl(`/api/products/${encodeURIComponent(slug)}`))
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );
        if (live) setGuestProducts(settled.filter(Boolean));
      } finally {
        if (live) setGuestLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [token, guestPairs]);

  const needsSize = (product) => Array.isArray(product.sizes) && product.sizes.length > 0;

  const defaultSelection = (product) => ({
    variant: Array.isArray(product.variants) && product.variants[0] ? product.variants[0] : null,
    size: product.defaultSize || undefined,
    qty: 1,
  });

  const onMoveToBag = async (product) => {
    const pid = String(product._id || product.id);
    // Ring sizes need an explicit choice — send shoppers to the PDP.
    if (needsSize(product) && !product.defaultSize) {
      navigate(`/products/${product.slug}`);
      return;
    }
    setMovingKey(pid);
    setMoveError('');
    try {
      if (token) {
        // A false return means the move was reverted (bag full, item
        // unavailable, or offline) — say so instead of silently snapping back.
        const moved = await moveFavToBag(product, defaultSelection(product));
        if (!moved) {
          setMoveError('Couldn’t move that piece to your bag — it may be unavailable or the bag is full. It’s still in your wishlist.');
        }
      } else {
        const sel = defaultSelection(product);
        if (addItem(product, sel.variant, sel.qty, sel.size)) toggleFav(product);
      }
    } finally {
      setMovingKey('');
    }
  };

  const loading = hydrating || guestLoading;
  const products = token ? memberProducts : guestProducts;
  const gridCols = 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3';

  return (
    <section className={embedded ? '' : 'py-10 md:py-14'}>
      <div className={embedded ? '' : 'container'}>
        {embedded ? (
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.9rem)', marginBottom: '24px' }}>Wishlist</h1>
        ) : (
          <div className="text-center" style={{ paddingBottom: '40px' }}>
            <p className="text-subheading" style={{ marginBottom: '12px' }}>Saved items</p>
            <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
              Your wishlist
            </h1>
          </div>
        )}

        {moveError ? (
          <p className="text-center text-[15px] text-red-700" role="alert" style={{ marginBottom: '24px' }}>
            {moveError}
          </p>
        ) : null}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-[#f1ece8] aspect-square" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center">
            <Heart size={48} className="text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-gray-500 text-[15px]" style={{ marginBottom: '24px' }}>
              {count === 0
                ? 'No favorites yet — tap the heart on any piece to save it here.'
                : 'Your saved pieces could not be loaded right now.'}
            </p>
            <Link to="/collections/rings" className="btn btn--primary">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-x-6 gap-y-[51px] ${embedded ? 'lg:gap-x-10 lg:gap-y-14' : 'lg:gap-x-20 lg:gap-y-20'} animate-fade-in-up`}>
            {products.map((product) => {
              const pid = String(product._id || product.id);
              const sized = needsSize(product) && !product.defaultSize;
              return (
                <div key={product.slug || pid}>
                  <ProductCard product={product} />
                  <button
                    onClick={() => onMoveToBag(product)}
                    disabled={movingKey === pid}
                    className="btn btn--secondary w-full disabled:opacity-50"
                    style={{ marginTop: '12px' }}
                  >
                    {movingKey === pid ? 'Moving…' : sized ? 'Select size' : 'Move to bag'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
