import ProductCard from './ProductCard';

export default function ProductGrid({ products, columns = 3 }) {
  // Live image sizes: 4 cols ≥990px, 3 cols ≥750px, 2 cols base
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5',
  };

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No products found.</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns] || gridCols[3]}`} style={{ columnGap: '16px', rowGap: '32px' }}>
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
