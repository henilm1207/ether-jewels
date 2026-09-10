import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import { resolveCategory, productsForCategory } from '../data/products';
import ProductGrid from '../components/product/ProductGrid';
import RangeSlider from '../components/filters/RangeSlider';

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
  { value: 'most-relevant', label: 'Most relevant' },
  { value: 'featured', label: 'Featured' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'name-asc', label: 'Alphabetically, A-Z' },
  { value: 'name-desc', label: 'Alphabetically, Z-A' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'date-asc', label: 'Date, old to new' },
  { value: 'date-desc', label: 'Date, new to old' },
];

const metalColors = [
  { name: 'Rose Gold', swatch: '#E0BFB8' },
  { name: 'White Gold', swatch: '#E8E8E8' },
  { name: 'Yellow Gold', swatch: '#FFD700' },
];
const metalKts = ['14K', '18K'];

const PRICE_MIN = 600;
const PRICE_MAX = 3000;
const PAGE_SIZE = 50;

const emptyFilters = { availability: ['in'], priceFrom: '', priceTo: '', shapes: [], kts: [], colors: [] };

function ChevronNext() {
  return (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ marginLeft: '8px' }}>
      <path d="M1 1l4 4-4 4" />
    </svg>
  );
}

export default function Collection() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { key: resolvedKey, info: categoryInfo } = resolveCategory(category);
  const [sortBy, setSortBy] = useState('most-relevant');
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileCols, setMobileCols] = useState(2);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  useEffect(() => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setSortBy('most-relevant');
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
    // Availability: everything is in stock; "out" alone yields none.
    if (applied.availability.length > 0 && !applied.availability.includes('in')) list = [];
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
    // KT: every setting is offered in 14K and 18K, so KT never excludes.
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

  const gotoPage = (p) => {
    setSearchParams(p === 1 ? {} : { page: String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleList = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // Active facet chips
  const chips = [];
  applied.availability.forEach((v) => {
    chips.push({ key: `avail-${v}`, label: v === 'in' ? 'In stock' : 'Out of stock', clear: () => setApplied({ ...applied, availability: applied.availability.filter((x) => x !== v) }) });
  });
  if (applied.priceFrom !== '' || applied.priceTo !== '') {
    const from = applied.priceFrom !== '' ? `$${applied.priceFrom}` : `$${PRICE_MIN}`;
    const to = applied.priceTo !== '' ? `$${applied.priceTo}` : `$${PRICE_MAX}`;
    chips.push({ key: 'price', label: `${from} – ${to}`, clear: () => setApplied({ ...applied, priceFrom: '', priceTo: '' }) });
  }
  applied.shapes.forEach((s) => {
    chips.push({ key: `shape-${s}`, label: s, clear: () => setApplied({ ...applied, shapes: applied.shapes.filter((x) => x !== s) }) });
  });
  applied.kts.forEach((k) => {
    chips.push({ key: `kt-${k}`, label: k, clear: () => setApplied({ ...applied, kts: applied.kts.filter((x) => x !== k) }) });
  });
  applied.colors.forEach((c) => {
    chips.push({ key: `color-${c}`, label: c, clear: () => setApplied({ ...applied, colors: applied.colors.filter((x) => x !== c) }) });
  });
  const hasActiveFilters = chips.length > 0;

  const sliderLo = draft.priceFrom !== '' ? Math.max(PRICE_MIN, Math.min(PRICE_MAX, Number(draft.priceFrom))) : PRICE_MIN;
  const sliderHi = draft.priceTo !== '' ? Math.max(PRICE_MIN, Math.min(PRICE_MAX, Number(draft.priceTo))) : PRICE_MAX;

  const description =
    descriptions[resolvedKey] ||
    (categoryInfo?.shape ? shapeDescription(categoryInfo.shape) : null) ||
    'Explore our complete collection of certified, handcrafted fine jewellery.';

  const sortSelect = (id, mobile) => (
    <select
      id={id}
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
      aria-label="Sort by"
      className="bg-white text-[#222] cursor-pointer"
      style={{
        fontSize: '13px',
        height: mobile ? '60px' : '44px',
        lineHeight: mobile ? '60px' : '42px',
        border: '1px solid #ededed',
        borderRadius: 0,
        padding: '0 22px 0 12px',
        maxWidth: '100%',
      }}
    >
      {sortOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  return (
    <section>
      {/* Top divider + banner — live 30px section padding, no eyebrow */}
      <div className="border-t border-[#ededed]" />
      <div className="container text-center" style={{ paddingTop: '30px', paddingBottom: '30px' }}>
        <h1
          className="font-heading"
          style={{ fontSize: 'clamp(32px, 5vw, 64px)', lineHeight: 1.2, marginBottom: 0 }}
        >
          {categoryInfo?.name || 'All Products'}
        </h1>
        <p
          className="mx-auto"
          style={{ marginTop: '12px', maxWidth: '76rem', fontSize: '15px', lineHeight: 1.7, color: '#222', opacity: 0.8 }}
        >
          {description}
        </p>
      </div>

      <div className="container" id="collection-wrapper">
        {/* Desktop toolbar — borderless, 38px bottom margin */}
        <div className="hidden md:flex items-center justify-between" style={{ marginBottom: '38px' }}>
          <button
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center gap-2 uppercase hover:opacity-70 transition-opacity"
            style={{ height: '46px', padding: '0 24px', border: '1px solid #d9d9d9', background: 'transparent', color: '#222', fontSize: '13px', fontWeight: 500, letterSpacing: '1px' }}
          >
            <SlidersHorizontal size={20} />
            Filter &amp; sort
          </button>
          {sortSelect('sort-desktop', false)}
        </div>

        {/* Mobile sticky bar — switcher | filter | spacer */}
        <div className="md:hidden sticky bg-white" style={{ top: '60px', zIndex: 20, padding: '8px 0' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 2fr 1fr', gap: '8px', alignItems: 'center' }}>
            <div className="flex" style={{ gap: '8px' }}>
              <button
                onClick={() => setMobileCols(1)}
                aria-label="One column"
                title="One column"
                className="flex items-center justify-center"
                style={{ width: '36px', height: '36px', border: '1px solid #ededed', background: mobileCols === 1 ? '#000' : '#fff', color: mobileCols === 1 ? '#fff' : '#222' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="2" y="1.5" width="8" height="9" />
                </svg>
              </button>
              <button
                onClick={() => setMobileCols(2)}
                aria-label="Two columns"
                title="Two columns"
                className="flex items-center justify-center"
                style={{ width: '36px', height: '36px', border: '1px solid #ededed', background: mobileCols === 2 ? '#000' : '#fff', color: mobileCols === 2 ? '#fff' : '#222' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="1" y="1.5" width="4" height="9" />
                  <rect x="7" y="1.5" width="4" height="9" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center justify-center gap-2 uppercase"
              style={{ height: '46px', padding: '0 24px', border: '1px solid #d9d9d9', background: 'transparent', color: '#222', fontSize: '13px', fontWeight: 500, letterSpacing: '1px' }}
            >
              <SlidersHorizontal size={20} />
              Filter &amp; sort
            </button>
            <span />
          </div>
        </div>

        {/* Active facet chips */}
        {hasActiveFilters && (
          <div className="flex flex-row flex-wrap" style={{ marginBottom: '16px' }} aria-live="polite">
            {chips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.clear}
                className="inline-flex items-center gap-2 underline underline-offset-4"
                style={{ height: '34px', padding: '0 12px', margin: '0 15px 15px 0', fontSize: '13px', color: '#222' }}
              >
                {chip.label}
                <X size={14} />
              </button>
            ))}
            <button
              onClick={() => { setApplied(emptyFilters); setDraft(emptyFilters); }}
              className="underline underline-offset-4"
              style={{ height: '34px', padding: '0 12px', margin: '0 0 15px 0', fontSize: '13px', color: '#222' }}
            >
              Clear all
            </button>
          </div>
        )}

        <ProductGrid products={pagedProducts} columns={4} mobileSingle={mobileCols === 1} />

        {/* Pagination — live text-link style */}
        {totalPages > 1 && (
          <nav className="text-center" style={{ marginTop: '48px' }} aria-label="Pagination">
            <ul className="inline-flex items-center" style={{ gap: '20px' }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <li key={i}>
                  {safePage === i + 1 ? (
                    <span aria-current="page" className="font-medium underline underline-offset-4" style={{ fontSize: '15px' }}>
                      {i + 1}
                    </span>
                  ) : (
                    <button onClick={() => gotoPage(i + 1)} className="underline underline-offset-4 hover:opacity-70" style={{ fontSize: '15px' }}>
                      {i + 1}
                    </button>
                  )}
                </li>
              ))}
              {safePage < totalPages && (
                <li>
                  <button onClick={() => gotoPage(safePage + 1)} className="inline-flex items-center underline underline-offset-4 hover:opacity-70" style={{ fontSize: '15px' }}>
                    Next
                    <ChevronNext />
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
        <div style={{ height: '48px' }} />
      </div>

      {/* Filter drawer — f-facets */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 z-[100] animate-fade-in" style={{ background: 'rgba(68,68,68,0.64)' }} onClick={() => setFilterOpen(false)} />
          <aside className="fixed top-0 left-0 h-full w-full max-w-[400px] bg-white z-[101] flex flex-col animate-slide-in-left" role="dialog" aria-label="Filters">
            <div className="flex items-center justify-between border-b border-[#ededed]" style={{ padding: '16px 20px', height: '60px' }}>
              <h2 className="font-heading" style={{ fontSize: '18px', marginBottom: 0 }}>Filter:</h2>
              <div className="flex items-center gap-3">
                <span role="status" className="text-[13px]" style={{ color: 'rgba(34,34,34,.75)' }}>
                  {filteredProducts.length} products
                </span>
                <button onClick={() => setFilterOpen(false)} aria-label="Close filters" className="p-1 hover:opacity-70">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              {/* Mobile sort block */}
              <div className="md:hidden" style={{ borderBottom: '1px solid #ededed', paddingBottom: '16px', marginTop: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Sort by</h3>
                {sortSelect('sort-mobile', true)}
              </div>

              <div style={{ borderBottom: '1px solid #ededed', marginTop: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Availability</h3>
                {[
                  { v: 'in', label: `In stock (${baseProducts.length})` },
                  { v: 'out', label: 'Out of stock (0)' },
                ].map((o) => (
                  <label key={o.v} className="flex items-center cursor-pointer" style={{ gap: '10px', fontSize: '15px', lineHeight: '36px' }}>
                    <input
                      type="checkbox"
                      checked={draft.availability.includes(o.v)}
                      onChange={() => setDraft({ ...draft, availability: toggleList(draft.availability, o.v) })}
                      className="accent-black"
                      style={{ width: '16px', height: '16px' }}
                    />
                    {o.label}
                  </label>
                ))}
                <div style={{ height: '16px' }} />
              </div>

              <div style={{ borderBottom: '1px solid #ededed', marginTop: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Price</h3>
                <RangeSlider
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={100}
                  lo={sliderLo}
                  hi={sliderHi}
                  onChange={(lo, hi) => setDraft({ ...draft, priceFrom: lo === PRICE_MIN ? '' : String(lo), priceTo: hi === PRICE_MAX ? '' : String(hi) })}
                />
                <div className="flex items-center" style={{ gap: '8px', marginTop: '12px' }}>
                  <label className="flex items-center flex-1 border border-[#ededed] bg-white" style={{ height: '38px' }}>
                    <span className="text-[15px] text-gray-500" style={{ paddingLeft: '12px' }}>$</span>
                    <input type="number" min={PRICE_MIN} max={PRICE_MAX} placeholder="From" aria-label="Price from" value={draft.priceFrom} onChange={(e) => setDraft({ ...draft, priceFrom: e.target.value })} className="flex-1 min-w-0 bg-transparent text-[15px] focus:outline-none" style={{ padding: '0 8px' }} />
                  </label>
                  <span className="text-[15px] text-gray-500">to</span>
                  <label className="flex items-center flex-1 border border-[#ededed] bg-white" style={{ height: '38px' }}>
                    <span className="text-[15px] text-gray-500" style={{ paddingLeft: '12px' }}>$</span>
                    <input type="number" min={PRICE_MIN} max={PRICE_MAX} placeholder="To" aria-label="Price to" value={draft.priceTo} onChange={(e) => setDraft({ ...draft, priceTo: e.target.value })} className="flex-1 min-w-0 bg-transparent text-[15px] focus:outline-none" style={{ padding: '0 8px' }} />
                  </label>
                </div>
                <div style={{ height: '16px' }} />
              </div>

              <div style={{ borderBottom: '1px solid #ededed', marginTop: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Diamond Shape</h3>
                {Object.keys(shapeCounts).sort().map((s) => (
                  <label key={s} className="flex items-center cursor-pointer" style={{ gap: '10px', fontSize: '15px', lineHeight: '36px' }}>
                    <input
                      type="checkbox"
                      checked={draft.shapes.includes(s)}
                      onChange={() => setDraft({ ...draft, shapes: toggleList(draft.shapes, s) })}
                      className="accent-black"
                      style={{ width: '16px', height: '16px' }}
                    />
                    {s}
                    <span style={{ color: 'rgba(34,34,34,.75)', fontSize: '13px' }}>({shapeCounts[s]})</span>
                  </label>
                ))}
                <div style={{ height: '16px' }} />
              </div>

              <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Metal</h3>
                <p className="text-[13px]" style={{ color: 'rgba(34,34,34,.75)', marginBottom: '8px' }}>Karat</p>
                {metalKts.map((k) => (
                  <label key={k} className="flex items-center cursor-pointer" style={{ gap: '10px', fontSize: '15px', lineHeight: '36px' }}>
                    <input
                      type="checkbox"
                      checked={draft.kts.includes(k)}
                      onChange={() => setDraft({ ...draft, kts: toggleList(draft.kts, k) })}
                      className="accent-black"
                      style={{ width: '16px', height: '16px' }}
                    />
                    {k}
                  </label>
                ))}
                <p className="text-[13px]" style={{ color: 'rgba(34,34,34,.75)', marginBottom: '12px', marginTop: '16px' }}>Color</p>
                <div className="flex" style={{ gap: '12px', paddingBottom: '8px' }}>
                  {metalColors.map((c) => {
                    const selected = draft.colors.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        onClick={() => setDraft({ ...draft, colors: toggleList(draft.colors, c.name) })}
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={selected}
                        className="rounded-full"
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: c.swatch,
                          border: selected ? 'none' : '1px solid #ededed',
                          boxShadow: selected ? 'inset 0 0 0 3px #fff, 0 0 0 4px #222' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ height: '16px' }} />
              </div>
            </div>

            <div style={{ padding: '16px 20px 24px' }}>
              <button
                onClick={() => { setApplied(draft); setFilterOpen(false); }}
                className="btn btn--primary w-full"
              >
                Apply
              </button>
            </div>
          </aside>
        </>
      )}
      <style>{`
        #collection-wrapper { margin-top: 30px; }
        @media (min-width: 768px) { #collection-wrapper { margin-top: 96px; } }
      `}</style>
    </section>
  );
}
