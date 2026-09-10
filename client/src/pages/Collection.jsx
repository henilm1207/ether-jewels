import { useParams } from 'react-router-dom';
import { products, categories } from '../data/products';
import ProductGrid from '../components/product/ProductGrid';

export default function Collection() {
  const { category } = useParams();
  const categoryInfo = categories[category];

  const filteredProducts = products.filter((p) => {
    if (!category) return true;
    return p.category === category;
  });

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <p className="text-subheading text-gray-500 mb-2">
            {categoryInfo?.parent || 'Collection'}
          </p>
          <h1
            className="font-heading"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '1px' }}
          >
            {categoryInfo?.name || 'All Products'}
          </h1>
        </div>

        {/* Product Grid */}
        <ProductGrid products={filteredProducts} columns={3} />
      </div>
    </section>
  );
}
