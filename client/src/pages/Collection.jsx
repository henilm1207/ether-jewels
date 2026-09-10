import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import { resolveCategory, productsForCategory } from '../data/products';
import ProductGrid from '../components/product/ProductGrid';

const descriptions = {
  rings:
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

const shapeDescription = (name) =>
  `${name}-cut certified designs, handcrafted with precision, brilliance, and enduring elegance. Choose your setting, diamond and metal — made to be adorned, loved, and remembered.`;

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'name-asc', label: 'Alphabetically, A-Z' },
  { value: 'name-desc', label: 'Alphabetically, Z-A' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'date-asc', label: 'Date, old to new' },
  { value: 'date-desc', label: 'Date, new to old' },
];

const metalColors = ['Rose Gold', 'White Gold', 'Yellow Gold'];
const metalKts = ['14K', '18K'];

const PAGE_SIZE = 12;

export default function Collection() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { key: resolvedKey, info: categoryInfo } = resolveCategory(category);
  const [sortBy, setSortBy] = useState('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  // Draft (drawer) + applied filter state
  const [draft, setDraft] = useState({ availability: 'in', priceFrom: '', priceTo: '', shapes: [], kts: [], colors: [] });
  const [applied, setApplied] = useState(draft);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  useEffect(() => {
    const reset = { availability: 'in', priceFrom: '', priceTo: '', shapes: [], kts: [], colors: [] };
    setDraft(reset);
    setApplied(reset);
    setSortBy('featured');
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const baseProducts = useMemo(() => productsForCategory(resolvedKey), [resolvedKey]);

  const shapeCounts = useMemo(() => {
    const counts = {};
    baseProducts.forEach((p) => {
      if (p.shape) counts[p.shape] = (counts[p.shape] || 0) + 1;
    });
    return counts;
  }, [baseProducts]);

  const filteredProducts = useMemo(() => {
    let list = [...baseProducts];
    if (applied.availability === 'out') list = [];
    const from = parseFloat(applied.priceFrom);
    const to = parseFloat(applied.priceTo);
    if (!Number.isNaN(from)) list = list.filter((p) => p.price >= from);
    if (!Number.isNaN(to)) list = list.filter((p) => p.price <= to);
    if (applied.shapes.length > 0) list = list.filter((p) => applied.shapes.includes(p.shape));
    if (applied.colors.length > 0) {
      list = list.filter((p) =>
        (p.variants || []).some((v) =>
          applied.colors.some((c) => (v.material || v.name || '').toLowerCase().includes(c.split(' ')[0].toLowerCase()))
        )
      );
    }
    // KT: every setting is offered in 14KT and 18KT, so KT never excludes.
    const sorted = [...list];
    if (sortBy === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name));
    return sorted;
  }, [baseProducts, applied, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeFilterCount =
    (applied.availability !== 'in' ? 1 : 0) +
    (applied.priceFrom !== '' || applied.priceTo !== '' ? 1 : 0) +
    (applied.shapes.length > 0 ? 1 : 0) +
    (applied.kts.length > 0 || applied.colors.length > 0 ? 1 : 0);

  const gotoPage = (p) => {
    setSearchParams(p === 1 ? {} : { page: String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleList = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const description =
    descriptions[resolvedKey] ||
    (categoryInfo?.shape ? shapeDescription(categoryInfo.shape) : null) ||
    'Explore our complete collection of certified, handcrafted fine jewellery.';

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto" style={{ paddingBottom: '40px' }}>
          <p className="text-subheading" style={{ marginBottom: '12px' }}>
            {categoryInfo?.parent || 'Collection'}
          </p>
          <h1
            className="font-heading"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: '24px' }}
          >
            {categoryInfo?.name || 'All Products'}
          </h1>
          <p className="text-gray-600 leading-relaxed text-[15px]">
            {description}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-y border-[#ededed] py-4 gap-3" style={{ marginBottom: '32px' }}>
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
              className="form-control"
              style={{ width: 'auto', minHeight: '38px', lineHeight: '36px', fontSize: '13px', padding: '0 35px 0 10px' }}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ProductGrid products={pagedProducts} columns={4} />

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
            {safePage < totalPages && (
              <button
                onClick={() => gotoPage(safePage + 1)}
                className="h-10 px-4 text-[13px] font-medium border bg-white text-[#222] border-[#ededed] hover:border-[#222] transition-colors"
              >
                Next
              </button>
            )}
          </nav>
        )}
      </div>

      {/* Filter drawer */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 z-[100] animate-fade-in" style={{ background: 'rgba(68,68,68,0.64)' }} onClick={() => setFilterOpen(false)} />
          <aside className="fixed top-0 left-0 h-full w-full max-w-[360px] bg-white z-[101] flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#ededed]">
              <h2 className="text-[13px] font-medium tracking-[1.5px] uppercase">Filter</h2>
              <button onClick={() => setFilterOpen(false)} aria-label="Close filters" className="p-1 hover:opacity-70">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              <div>
                <h3 className="text-[13px] font-medium uppercase tracking-[1px]" style={{ marginBottom: '12px' }}>Availability</h3>
                {[
                  { v: 'in', label: `In stock (${baseProducts.length})` },
                  { v: 'out', label: 'Out of stock (0)' },
                ].map((o) => (
                  <label key={o.v} className="flex items-center gap-2.5 text-[15px] py-1.5 cursor-pointer">
                    <input type="radio" name="availability" checked={draft.availability === o.v} onChange={() => setDraft({ ...draft, availability: o.v })} className="accent-black" />
                    {o.label}
                  </label>
                ))}
              </div>
              <div>
                <h3 className="text-[13px] font-medium uppercase tracking-[1px]" style={{ marginBottom: '12px' }}>Price</h3>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} placeholder="From $" value={draft.priceFrom} onChange={(e) => setDraft({ ...draft, priceFrom: e.target.value })} className="form-control" aria-label="Price from" />
                  <span className="text-gray-400">–</span>
                  <input type="number" min={0} placeholder="To $" value={draft.priceTo} onChange={(e) => setDraft({ ...draft, priceTo: e.target.value })} className="form-control" aria-label="Price to" />
                </div>
              </div>
              <div>
                <h3 className="text-[13px] font-medium uppercase tracking-[1px]" style={{ marginBottom: '12px' }}>Diamond Shape</h3>
                {Object.keys(shapeCounts).sort().map((s) => (
                  <label key={s} className="flex items-center gap-2.5 text-[15px] py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.shapes.includes(s)}
                      onChange={() => setDraft({ ...draft, shapes: toggleList(draft.shapes, s) })}
                      className="accent-black"
                    />
                    {s} ({shapeCounts[s]})
                  </label>
                ))}
              </div>
              <div>
                <h3 className="text-[13px] font-medium uppercase tracking-[1px]" style={{ marginBottom: '12px' }}>Metal</h3>
                <p className="text-[13px] text-gray-500" style={{ marginBottom: '8px' }}>Karat</p>
                {metalKts.map((k) => (
                  <label key={k} className="flex items-center gap-2.5 text-[15px] py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.kts.includes(k)}
                      onChange={() => setDraft({ ...draft, kts: toggleList(draft.kts, k) })}
                      className="accent-black"
                    />
                    {k}
                  </label>
                ))}
                <p className="text-[13px] text-gray-500" style={{ marginBottom: '8px', marginTop: '12px' }}>Color</p>
                {metalColors.map((c) => (
                  <label key={c} className="flex items-center gap-2.5 text-[15px] py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.colors.includes(c)}
                      onChange={() => setDraft({ ...draft, colors: toggleList(draft.colors, c) })}
                      className="accent-black"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-[#ededed] px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  const reset = { availability: 'in', priceFrom: '', priceTo: '', shapes: [], kts: [], colors: [] };
                  setDraft(reset);
                  setApplied(reset);
                }}
                className="flex-1 py-3 border border-[#222] text-[13px] font-medium uppercase tracking-wider hover:bg-gray-50"
              >
                Clear all
              </button>
              <button
                onClick={() => { setApplied(draft); setFilterOpen(false); }}
                className="flex-1 py-3 bg-[#222] text-white text-[13px] font-medium uppercase tracking-wider hover:bg-black"
              >
                Apply
              </button>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
