import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { apiUrl } from '../config';
import { useWishlist } from '../context/WishlistContext';
import ProductGrid from '../components/product/ProductGrid';

// /account/wishlist — the customer's favorites. Guests resolve via their
// saved slugs; members via server ids. Catalog pages cap at 100/page.
export default function Wishlist() {
  const { ids, guestPairs, count } = useWishlist();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        const wantedIds = new Set(ids.map(String));
        const wantedSlugs = new Set(guestPairs.map((p) => p.slug).filter(Boolean));
        if (wantedIds.size === 0 && wantedSlugs.size === 0) {
          if (live) setItems([]);
          return;
        }
        const found = [];
        let page = 1;
        for (; page <= 5; page++) {
          const res = await fetch(apiUrl(`/api/products?page=${page}&limit=100`));
          if (!res.ok) break;
          const data = await res.json();
          for (const p of data.items || []) {
            if (wantedIds.has(String(p._id)) || (p.slug && wantedSlugs.has(p.slug))) found.push(p);
          }
          if (page >= (data.pages || 1)) break;
        }
        // Preserve favorite order (most recent last).
        const rank = new Map();
        [...ids.map(String), ...guestPairs.map((p) => p.slug)].forEach((k, i) => rank.set(k, i));
        found.sort(
          (a, b) =>
            (rank.get(String(a._id)) ?? rank.get(a.slug) ?? 0) -
            (rank.get(String(b._id)) ?? rank.get(b.slug) ?? 0)
        );
        if (live) setItems(found);
      } catch {
        if (live) setItems([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [ids, guestPairs]);

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <div className="text-center" style={{ paddingBottom: '40px' }}>
          <p className="text-subheading" style={{ marginBottom: '12px' }}>Saved items</p>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
            Your wishlist
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-[#f1ece8] aspect-square" />
            ))}
          </div>
        ) : items.length === 0 ? (
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
          <ProductGrid products={items} />
        )}
      </div>
    </section>
  );
}
