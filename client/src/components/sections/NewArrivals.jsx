import { products } from '../../data/products';
import ProductCard from '../product/ProductCard';

export default function NewArrivals() {
  const newProducts = products.filter((p) => p.featured);

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

        {/* 5 featured products — one clean row on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5" style={{ columnGap: '16px', rowGap: '32px' }}>
          {newProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
