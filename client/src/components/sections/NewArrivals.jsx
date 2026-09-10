import { products } from '../../data/products';
import ProductCard from '../product/ProductCard';

export default function NewArrivals() {
  const newProducts = products.filter((p) => p.featured);

  return (
    <section className="py-[30px] bg-white border-t border-[#ededed]">
      <div className="container">
        <div className="text-center mb-8 md:mb-10 max-w-[78rem] mx-auto">
          <p className="text-subheading text-gray-500 mb-2 animate-fade-in-up delay-0">
            Our Latest Arrivals
          </p>
          <h2
            className="font-heading animate-fade-in-up delay-50"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', letterSpacing: '1px' }}
          >
            New Arrivals — Solitaire Engagement Rings
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
          {newProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
