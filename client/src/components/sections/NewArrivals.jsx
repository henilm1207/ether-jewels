import { products } from '../../data/products';
import ProductCard from '../product/ProductCard';

export default function NewArrivals() {
  const newProducts = products.filter((p) => p.featured);

  return (
    <section className="bg-white border-t border-[#ededed] section-padding-lg" style={{ paddingTop: '60px' }}>
      <div className="container">
        <div className="section-header">
          <p className="text-subheading mb-3 animate-fade-in-up delay-0">
            Our Latest Arrivals
          </p>
          <h2
            className="font-heading animate-fade-in-up delay-50"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', letterSpacing: '1px', lineHeight: 1.25 }}
          >
            New Arrivals — Solitaire Engagement Rings
          </h2>
        </div>

        {/* 5 featured products — one clean Prestige row on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-5 md:gap-y-10">
          {newProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
