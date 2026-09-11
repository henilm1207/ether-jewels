import ProductCard from './ProductCard';

export default function ProductGrid({ products, columns = 3, mobileSingle = false }) {
  // Live: 2 cols base, 2 cols md, 3 cols lg/xl (collection). 5-col path kept for New Arrivals.
  const gridCols = {
    2: 'grid-cols-2',
    3: `${mobileSingle ? 'grid-cols-1' : 'grid-cols-2'} md:grid-cols-2 lg:grid-cols-3`,
    4: `${mobileSingle ? 'grid-cols-1' : 'grid-cols-2'} md:grid-cols-3 lg:grid-cols-4`,
    5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  };

  if (!products || products.length === 0) {
    return (
      <div className="text-center" style={{ paddingTop: '100px' }}>
        <h2 className="h4" style={{ marginBottom: '4px' }}>No products found.</h2>
        <p className="text-[15px]" style={{ color: 'rgba(34,34,34,.75)' }}>
          Try removing some filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid ${gridCols[columns] || gridCols[3]} gap-x-6 gap-y-[51px] lg:gap-x-20 lg:gap-y-20 animate-fade-in-up`}
    >
      {products.map((product, i) => (
        <ProductCard key={product.slug} product={product} priority={i === 0} />
      ))}
    </div>
  );
}
