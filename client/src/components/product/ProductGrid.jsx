import ProductCard from './ProductCard';

export default function ProductGrid({ products, columns = 3 }) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  };

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No products found.</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns] || gridCols[3]} gap-x-4 gap-y-8 md:gap-x-5 md:gap-y-10`}>
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
