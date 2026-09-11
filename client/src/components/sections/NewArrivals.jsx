import { useEffect, useState } from 'react';
import { apiUrl } from '../../config';
import ProductCard from '../product/ProductCard';

export default function NewArrivals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/products?featured=true&limit=10'));
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (live) setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (live) setItems([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="bg-white section-padding-lg">
      <div className="container">
        <div className="section-header">
          <p className="section__subheading animate-fade-in-up delay-0">
            Our Latest Arrivals
          </p>
          <h2
            className="font-heading animate-fade-in-up delay-50"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', lineHeight: 1.25, marginBottom: 0 }}
          >
            New Arrivals — Solitaire Engagement Rings
          </h2>
        </div>

        {/* Featured products — one clean row on desktop */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-[51px] xl:gap-x-12 xl:gap-y-12" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[#f1ece8] aspect-square" />
                <div className="bg-[#f1ece8] mx-auto" style={{ height: '14px', width: '70%', marginTop: '12px' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-[51px] xl:gap-x-12 xl:gap-y-12 animate-fade-in-up">
            {items.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
