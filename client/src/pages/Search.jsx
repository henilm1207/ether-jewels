import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { products } from '../data/products';
import ProductGrid from '../components/product/ProductGrid';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [value, setValue] = useState(query);

  useEffect(() => {
    setValue(query);
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) =>
      [
        p.name,
        p.category,
        p.shape,
        p.shortDescription,
        p.style,
        (p.tags || []).join(' '),
        (p.variants || []).map((v) => `${v.name} ${v.material || ''}`).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const submit = (e) => {
    e.preventDefault();
    setSearchParams(value.trim() ? { q: value.trim() } : {});
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto" style={{ paddingBottom: '40px' }}>
          <p className="text-subheading" style={{ marginBottom: '12px' }}>Search</p>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
            Search
          </h1>
        </div>

        <form onSubmit={submit} className="relative max-w-xl mx-auto" style={{ marginBottom: '32px' }}>
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search"
            className="form-control"
            style={{ paddingLeft: '36px' }}
          />
        </form>

        {query.trim() ? (
          <>
            <p role="status" className="text-center text-[13px] text-gray-500" style={{ marginBottom: '32px' }}>
              {results.length} product{results.length === 1 ? '' : 's'} for &ldquo;{query.trim()}&rdquo;
            </p>
            {results.length > 0 ? (
              <ProductGrid products={results} columns={4} />
            ) : (
              <p className="text-center text-gray-500 text-[15px]">
                No results found. Try &ldquo;solitaire&rdquo;, &ldquo;halo&rdquo; or &ldquo;oval&rdquo;.
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-gray-500 text-[15px]">
            Type above to search rings, diamonds and shapes.
          </p>
        )}
      </div>
    </section>
  );
}
