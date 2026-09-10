import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { products, categories } from '../data/products';
import ProductGrid from '../components/product/ProductGrid';

const categoryDescriptions = {
  'solitaire-rings':
    'From timeless solitaires to modern statement designs, our ring collection is crafted to celebrate every moment. Each piece is thoughtfully designed with precision, brilliance, and enduring elegance.',
  'halo-rings':
    'Halo settings that frame your center stone in a circle of brilliance — timeless designs crafted for maximum light.',
  'engagement-rings':
    'Timeless engagement rings crafted with certified lab-grown diamonds — designed to be adorned, loved, and remembered.',
  'three-stone-rings':
    'Past, present, and future — three-stone designs that tell your story in certified brilliance.',
  bands:
    'Timeless bands crafted for everyday confidence — from polished classics to pavé-set statements.',
  earrings:
    'Our earring collection blends classic craftsmanship with modern aesthetics. From subtle sparkle to striking statements, each design is created to shine with confidence.',
  bracelets:
    'Graceful bracelets crafted with certified diamonds — timeless pieces made to move with you.',
  necklaces:
    'Discover necklaces that frame your presence with effortless grace. From everyday essentials to radiant diamond creations, each design is made to shine with you.',
};

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export default function Collection() {
  const { category } = useParams();
  const categoryInfo = categories[category];
  const [sortBy, setSortBy] = useState('featured');

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (!category) return true;
      return p.category === category;
    });

    const sorted = [...list];
    if (sortBy === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [category, sortBy]);

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        {/* Header — matches reference: eyebrow, title, description */}
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <p className="text-subheading mb-3">
            {categoryInfo?.parent || 'Collection'}
          </p>
          <h1
            className="font-heading mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '1px', lineHeight: 1.2 }}
          >
            {categoryInfo?.name || 'All Products'}
          </h1>
          {(categoryDescriptions[category] || (!category && 'Explore our complete collection of certified, handcrafted fine jewellery.')) && (
            <p className="text-gray-600 leading-relaxed text-[15px]">
              {categoryDescriptions[category] || 'Explore our complete collection of certified, handcrafted fine jewellery.'}
            </p>
          )}
        </div>

        {/* Toolbar — Filter count + Sort by (reference) */}
        <div className="flex items-center justify-between border-t border-b border-[#ededed] py-3.5 mb-8 md:mb-10">
          <p className="text-[13px] text-gray-500">
            Filter: <span className="text-[#222] font-medium">{filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}</span>
          </p>
          <label className="flex items-center gap-2 text-[13px] text-gray-500">
            <span className="hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[13px] text-[#222] bg-white border border-[#ededed] px-2.5 py-1.5 focus:outline-none focus:border-[#222] cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Product Grid — Prestige 4-per-row on desktop */}
        <ProductGrid products={filteredProducts} columns={4} />
      </div>
    </section>
  );
}
