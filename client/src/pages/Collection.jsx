import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { X, SlidersHorizontal } from 'lucide-react';
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

const PAGE_SIZE = 12;

export default function Collection() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryInfo = categories[category];
  const [sortBy, setSortBy] = useState('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const [availability, setAvailability] = useState('all');
  const [maxPrice, setMaxPrice] = useState(3000);
  const [shape, setShape] = useState('all');

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  useEffect(() => {
    setSearchParams({}, { replace: true });
    setAvailability('all');
    setMaxPrice(3000);
    setShape('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (!category) return true;
      return p.category === category;
    });

    if (maxPrice < 3000) list = list.filter((p) => p.price <= maxPrice);
    if (shape !== 'all') {
      list = list.filter((p) => p.name.toLowerCase().includes(shape.toLowerCase()));
    }

    const sorted = [...list];
    if (sortBy === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [category, sortBy, maxPrice, shape]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeFilterCount = (availability !== 'all' ? 1 : 0) + (maxPrice < 3000 ? 1 : 0) + (shape !== 'all' ? 1 : 0);

  const gotoPage = (p) => {
    setSearchParams(p === 1 ? {} : { page: String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <p className="text-subheading mb-3">
            {categoryInfo?.parent || 'Collection'}
          </p>
          <h1
            className="font-heading mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '2.5px', lineHeight: 1.2 }}
          >
            {categoryInfo?.name || 'All Products'}
          </h1>
          <p className="text-gray-600 leading-relaxed text-[15px]">
            {categoryDescriptions[category] || 'Explore our complete collection of certified, handcrafted fine jewellery.'}
          </p>
        </div>

        {/* Toolbar — Filter left + count + Sort right */}
        <div className="flex items-center justify-between border-y border-[#ededed] py-4 mb-8 md:mb-10 gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[1px] hover:opacity-70"
            >
              <SlidersHorizontal size={15} />
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            <p className="text-[13px] text-gray-500 hidden sm:block">
              Filter: <span className="text-[#222] font-medium">{filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}</span>
            </p>
          </div>
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

        {/* Product Grid — 4-per-row desktop, 24px gaps */}
        <ProductGrid products={pagedProducts} columns={4} />

        {/* Pagination — 12 per page */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Pagination">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => gotoPage(i + 1)}
                aria-current={safePage === i + 1 ? 'page' : undefined}
                className={`w-10 h-10 text-[13px] font-medium border transition-colors ${
                  safePage === i + 1
                    ? 'bg-[#222] text-white border-[#222]'
                    : 'bg-white text-[#222] border-[#ededed] hover:border-[#222]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Filter drawer — Availability / Price / Shape */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[100] animate-fade-in" onClick={() => setFilterOpen(false)} />
          <aside className="fixed top-0 left-0 h-full w-full max-w-[360px] bg-white z-[101] flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#ededed]">
              <h2 className="text-[13px] font-medium tracking-[1.5px] uppercase">Filter</h2>
              <button onClick={() => setFilterOpen(false)} aria-label="Close filters" className="p-1 hover:opacity-70">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              <div>
                <h3 className="text-[13px] font-medium uppercase tracking-[1px] mb-3">Availability</h3>
                {['all', 'in-stock'].map((v) => (
                  <label key={v} className="flex items-center gap-2.5 text-sm py-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      checked={availability === v}
                      onChange={() => setAvailability(v)}
                      className="accent-black"
                    />
                    {v === 'all' ? 'All' : 'In stock'}
                  </label>
                ))}
              </div>
              <div>
                <h3 className="text-[13px] font-medium uppercase tracking-[1px] mb-3">
                  Price <span className="text-gray-400 font-normal normal-case">— up to ${maxPrice}</span>
                </h3>
                <input
                  type="range"
                  min={600}
                  max={3000}
                  step={100}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-black"
                />
              </div>
              <div>
                <h3 className="text-[13px] font-medium uppercase tracking-[1px] mb-3">Shape</h3>
                {['all', 'Round', 'Oval', 'Pear', 'Emerald'].map((s) => (
                  <label key={s} className="flex items-center gap-2.5 text-sm py-1.5 cursor-pointer capitalize">
                    <input
                      type="radio"
                      name="shape"
                      checked={shape === s}
                      onChange={() => setShape(s)}
                      className="accent-black"
                    />
                    {s === 'all' ? 'All shapes' : s}
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-[#ededed] px-6 py-4 flex gap-3">
              <button
                onClick={() => { setAvailability('all'); setMaxPrice(3000); setShape('all'); }}
                className="flex-1 py-3 border border-[#222] text-[13px] font-medium uppercase tracking-wider hover:bg-gray-50"
              >
                Clear all
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="flex-1 py-3 bg-[#222] text-white text-[13px] font-medium uppercase tracking-wider hover:bg-black"
              >
                Show {filteredProducts.length}
              </button>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
