import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import { apiUrl } from '../config';
import { METALS } from '../lib/metals';
import { SUBS } from '../data/catalog';
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
  { value: 'featured', label: 'Featured' },
  { value: 'most-relevant', label: 'Most relevant' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'name-asc', label: 'Alphabetically, A-Z' },
  { value: 'name-desc', label: 'Alphabetically, Z-A' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'date-asc', label: 'Date, old to new' },
  { value: 'date-desc', label: 'Date, new to old' },
];

// Filter swatches read the same static map as the admin form (order kept).
const metalColors = ['Rose Gold', 'White Gold', 'Yellow Gold'].map(
  (name) => METALS.find((m) => m.name === name)
);
const metalKts = ['14K', '18K'];

// Diamond grade scales — source of truth is server/config/catalog.js
// (DIAMOND_COLORS / DIAMOND_CLARITY); admin ui.jsx mirrors them.
const DIAMOND_COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
const DIAMOND_CLARITY = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];

const PRICE_MIN = 600;
const PRICE_MAX = 3000;
const PAGE_SIZE = 12;

const emptyFilters = { availability: [], priceFrom: '', priceTo: '', shapes: [], kts: [], colors: [], categories: [], diamondColors: [], clarities: [] };

// Leaf category key → display name (static SUBS covers every shelf;
// unknown keys fall back to a prettified key).
const SUB_NAME_BY_KEY = {};
Object.values(SUBS).forEach((arr) => arr.forEach((s) => { SUB_NAME_BY_KEY[s.key] = s.name; }));
const catName = (key) =>
  SUB_NAME_BY_KEY[key] || String(key || '').split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

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
  const [resolvedKey, setResolvedKey] = useState(category);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [baseProducts, setBaseProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileCols, setMobileCols] = useState(2);
  const [draft, setDraft] = useState({ ...emptyFilters, availability: [] });
  const [applied, setApplied] = useState({ ...emptyFilters, availability: [] });

  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

  useEffect(() => {
    setDraft({ ...emptyFilters, availability: [] });
    setApplied({ ...emptyFilters, availability: [] });
    setSortBy('featured');
    setSearchParams({}, { replace: true });
    setLoading(true);
    setLoadError('');
    setBaseProducts([]);
    setCategoryInfo(null);
    let live = true;
    (async () => {
      try {
        // Category info first (server resolves aliases); unknown key → 404 → not-found state.
        let info = null;
        try {
          const res = await fetch(apiUrl(`/api/categories/${encodeURIComponent(category)}`));
          if (res.ok) info = await res.json();
        } catch { /* offline → error below */ }
        if (!live) return;
        if (!info) {
          setResolvedKey(category);
          setCategoryInfo(null);
          setBaseProducts([]);
          setLoading(false);
          return;
        }
        setResolvedKey(info.key);
        setCategoryInfo(info);
        const res = await fetch(apiUrl(`/api/products?category=${encodeURIComponent(category)}&limit=100`));
        if (!res.ok) throw new Error('Could not load products');
        const data = await res.json();
        if (!live) return;
        setBaseProducts(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (live) setLoadError(e.message || 'Could not load this collection.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // A product's shapes = legacy primary + multi list, deduped.
  const productShapes = (p) => [...new Set([p.shape, ...(p.shapes || [])].filter(Boolean))];

  const shapeCounts = useMemo(() => {
    const counts = {};
    baseProducts.forEach((p) => {
      productShapes(p).forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return counts;
  }, [baseProducts]);

  // Category counts from the loaded products (leaf keys, e.g. solitaire-rings).
  const categoryCounts = useMemo(() => {
    const counts = {};
    baseProducts.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [baseProducts]);

  // Diamond grade counts (only grades present on loaded products).
  const diamondColorCounts = useMemo(() => {
    const counts = {};
    baseProducts.forEach((p) => {
      (p.diamondColors || []).forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  }, [baseProducts]);
  const clarityCounts = useMemo(() => {
    const counts = {};
    baseProducts.forEach((p) => {
      (p.clarity || []).forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  }, [baseProducts]);
  const categoryKeys = useMemo(() => Object.keys(categoryCounts).sort((a, b) => catName(a).localeCompare(catName(b))), [categoryCounts]);

  const filteredProducts = useMemo(() => {
    let list = [...baseProducts];
    // Availability: empty = all; "out" alone yields none (everything is in stock).
    if (applied.availability.length > 0 && !applied.availability.includes('in')) list = [];
    const from = parseFloat(applied.priceFrom);
    const to = parseFloat(applied.priceTo);
    if (!Number.isNaN(from)) list = list.filter((p) => p.price >= from);
    if (!Number.isNaN(to)) list = list.filter((p) => p.price <= to);
    if (applied.shapes.length > 0)
      list = list.filter((p) => applied.shapes.some((s) => productShapes(p).includes(s)));
    if (applied.diamondColors.length > 0)
      list = list.filter((p) => applied.diamondColors.some((c) => (p.diamondColors || []).includes(c)));
    if (applied.clarities.length > 0)
      list = list.filter((p) => applied.clarities.some((c) => (p.clarity || []).includes(c)));
    if (applied.categories.length > 0)
      list = list.filter((p) => applied.categories.includes(p.category));
    if (applied.colors.length > 0) {
      list = list.filter((p) =>
        (p.variants || []).some((v) =>
          applied.colors.some((c) => (v.material || v.name || '').toLowerCase().includes(c.split(' ')[0].toLowerCase()))
        )
      );
    }
    // KT: every setting is offered in 14K and 18K, so KT never excludes.
    const sorted = [...list];
    if (sortBy === 'featured' || sortBy === 'most-relevant') sorted.sort((a, b) => Number(b.featured || false) - Number(a.featured || false));
    if (sortBy === 'best-selling') sorted.sort((a, b) => Number((b.tags || []).includes('bestseller')) - Number((a.tags || []).includes('bestseller')));
    if (sortBy === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === 'date-asc' || sortBy === 'date-desc') sorted.sort((a, b) => Number(b.featured || false) - Number(a.featured || false));
    return sorted;
  }, [baseProducts, applied, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page !== safePage) setSearchParams(safePage === 1 ? {} : { page: String(safePage) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);
  const pagedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const gotoPage = (p) => {
    setSearchParams(p === 1 ? {} : { page: String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleList = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // Active facet chips (clear syncs applied + draft so drawer reopens clean)
  const syncClear = (patch) => {
    setApplied((p) => ({ ...p, ...patch }));
    setDraft((d) => ({ ...d, ...patch }));
  };
  const chips = [];
  applied.availability.forEach((v) => {
    chips.push({ key: `avail-${v}`, label: v === 'in' ? 'In stock' : 'Out of stock', clear: () => syncClear({ availability: applied.availability.filter((x) => x !== v) }) });
  });
  if (applied.priceFrom !== '' || applied.priceTo !== '') {
    const from = applied.priceFrom !== '' ? `$${applied.priceFrom}` : `$${PRICE_MIN}`;
    const to = applied.priceTo !== '' ? `$${applied.priceTo}` : `$${PRICE_MAX}`;
    chips.push({ key: 'price', label: `${from} – ${to}`, clear: () => syncClear({ priceFrom: '', priceTo: '' }) });
  }
  applied.shapes.forEach((s) => {
    chips.push({ key: `shape-${s}`, label: s, clear: () => syncClear({ shapes: applied.shapes.filter((x) => x !== s) }) });
  });
  applied.categories.forEach((c) => {
    chips.push({ key: `cat-${c}`, label: catName(c), clear: () => syncClear({ categories: applied.categories.filter((x) => x !== c) }) });
  });
  applied.kts.forEach((k) => {
    chips.push({ key: `kt-${k}`, label: `${k} (all settings offered in 14K & 18K)`, clear: () => syncClear({ kts: applied.kts.filter((x) => x !== k) }) });
  });
  applied.colors.forEach((c) => {
    chips.push({ key: `color-${c}`, label: c, clear: () => syncClear({ colors: applied.colors.filter((x) => x !== c) }) });
  });
  applied.diamondColors.forEach((c) => {
    chips.push({ key: `dcolor-${c}`, label: `Color ${c}`, clear: () => syncClear({ diamondColors: applied.diamondColors.filter((x) => x !== c) }) });
  });
  applied.clarities.forEach((c) => {
    chips.push({ key: `clarity-${c}`, label: c, clear: () => syncClear({ clarities: applied.clarities.filter((x) => x !== c) }) });
  });
  const hasActiveFilters = chips.length > 0;

  const numOr = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(PRICE_MIN, Math.min(PRICE_MAX, n)) : fallback;
  };
  const sliderLo = draft.priceFrom !== '' ? numOr(draft.priceFrom, PRICE_MIN) : PRICE_MIN;
  const sliderHi = draft.priceTo !== '' ? numOr(draft.priceTo, PRICE_MAX) : PRICE_MAX;

  const description =
    categoryInfo?.description ||
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
          {categoryInfo?.name || 'Collection not found'}
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

        <p role="status" className="text-[13px]" style={{ color: 'rgba(34,34,34,.75)', marginBottom: '16px' }}>
          {loading ? 'Loading products…' : `${filteredProducts.length} products`}
        </p>
        {loadError ? (
          <div className="text-center" style={{ padding: '40px 0' }}>
            <p className="text-gray-600 text-[15px]" style={{ marginBottom: '16px' }}>{loadError}</p>
            <button onClick={() => window.location.reload()} className="btn btn--secondary">Retry</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-[51px]" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[#f1ece8] aspect-square" />
                <div className="bg-[#f1ece8] mx-auto" style={{ height: '14px', width: '70%', marginTop: '12px' }} />
                <div className="bg-[#f1ece8] mx-auto" style={{ height: '14px', width: '40%', marginTop: '8px' }} />
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid products={pagedProducts} columns={3} mobileSingle={mobileCols === 1} />
        )}

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

              {/* Category — jewellery type facet; hidden when the page holds one */}
              {categoryKeys.length > 1 && (
                <div style={{ borderBottom: '1px solid #ededed', marginTop: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Category</h3>
                  {categoryKeys.map((c) => (
                    <label key={c} className="flex items-center cursor-pointer" style={{ gap: '10px', fontSize: '15px', lineHeight: '36px' }}>
                      <input
                        type="checkbox"
                        checked={draft.categories.includes(c)}
                        onChange={() => setDraft({ ...draft, categories: toggleList(draft.categories, c) })}
                        className="accent-black"
                        style={{ width: '16px', height: '16px' }}
                      />
                      {catName(c)}
                      <span style={{ color: 'rgba(34,34,34,.75)', fontSize: '13px' }}>({categoryCounts[c]})</span>
                    </label>
                  ))}
                  <div style={{ height: '16px' }} />
                </div>
              )}

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
                  <label className="relative flex items-center flex-1 border border-[#ededed] bg-white" style={{ height: '38px' }}>
                    <span aria-hidden="true" className="absolute text-[15px] text-gray-500 pointer-events-none shrink-0" style={{ left: '12px' }}>$</span>
                    <input type="number" min={PRICE_MIN} max={PRICE_MAX} placeholder="From" aria-label="Price from" value={draft.priceFrom} onChange={(e) => setDraft({ ...draft, priceFrom: e.target.value })} className="price-input flex-1 min-w-0 w-full bg-transparent text-[15px] focus:outline-none" style={{ padding: '0 8px 0 28px' }} />
                  </label>
                  <span className="text-[15px] text-gray-500">to</span>
                  <label className="relative flex items-center flex-1 border border-[#ededed] bg-white" style={{ height: '38px' }}>
                    <span aria-hidden="true" className="absolute text-[15px] text-gray-500 pointer-events-none shrink-0" style={{ left: '12px' }}>$</span>
                    <input type="number" min={PRICE_MIN} max={PRICE_MAX} placeholder="To" aria-label="Price to" value={draft.priceTo} onChange={(e) => setDraft({ ...draft, priceTo: e.target.value })} className="price-input flex-1 min-w-0 w-full bg-transparent text-[15px] focus:outline-none" style={{ padding: '0 8px 0 28px' }} />
                  </label>
                </div>
                <div style={{ height: '16px' }} />
              </div>

              <div style={{ borderBottom: '1px solid #ededed', marginTop: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Diamond Shape</h3>                {Object.keys(shapeCounts).sort().map((s) => (
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

              {/* Diamond Color + Clarity — only grades present on loaded products */}
              {DIAMOND_COLORS.some((c) => diamondColorCounts[c]) && (
                <div style={{ borderBottom: '1px solid #ededed', marginTop: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Diamond Color</h3>
                  {DIAMOND_COLORS.filter((c) => diamondColorCounts[c]).map((c) => (
                    <label key={c} className="flex items-center cursor-pointer" style={{ gap: '10px', fontSize: '15px', lineHeight: '36px' }}>
                      <input
                        type="checkbox"
                        checked={draft.diamondColors.includes(c)}
                        onChange={() => setDraft({ ...draft, diamondColors: toggleList(draft.diamondColors, c) })}
                        className="accent-black"
                        style={{ width: '16px', height: '16px' }}
                      />
                      {c}
                      <span style={{ color: 'rgba(34,34,34,.75)', fontSize: '13px' }}>({diamondColorCounts[c]})</span>
                    </label>
                  ))}
                  <div style={{ height: '16px' }} />
                </div>
              )}

              {DIAMOND_CLARITY.some((c) => clarityCounts[c]) && (
                <div style={{ borderBottom: '1px solid #ededed', marginTop: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 500, padding: '16px 0' }}>Clarity</h3>
                  {DIAMOND_CLARITY.filter((c) => clarityCounts[c]).map((c) => (
                    <label key={c} className="flex items-center cursor-pointer" style={{ gap: '10px', fontSize: '15px', lineHeight: '36px' }}>
                      <input
                        type="checkbox"
                        checked={draft.clarities.includes(c)}
                        onChange={() => setDraft({ ...draft, clarities: toggleList(draft.clarities, c) })}
                        className="accent-black"
                        style={{ width: '16px', height: '16px' }}
                      />
                      {c}
                      <span style={{ color: 'rgba(34,34,34,.75)', fontSize: '13px' }}>({clarityCounts[c]})</span>
                    </label>
                  ))}
                  <div style={{ height: '16px' }} />
                </div>
              )}

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
