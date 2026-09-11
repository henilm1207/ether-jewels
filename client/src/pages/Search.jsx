import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { apiUrl } from '../config';
import ProductGrid from '../components/product/ProductGrid';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [value, setValue] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/products?search=${encodeURIComponent(q)}&limit=50`));
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (live) setResults(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (live) setResults([]);
      } finally {
        if (live) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [query]);

  const submit = (e) => {
    e.preventDefault();
    setSearchParams(value.trim() ? { q: value.trim() } : {});
  };

  const count = useMemo(() => results.length, [results]);

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
              {loading ? 'Searching…' : `${count} product${count === 1 ? '' : 's'} for “${query.trim()}”`}
            </p>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-[51px]" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-[#f1ece8] aspect-square" />
                    <div className="bg-[#f1ece8] mx-auto" style={{ height: '14px', width: '70%', marginTop: '12px' }} />
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <ProductGrid products={results} columns={4} />
            ) : searched ? (
              <p className="text-center text-gray-500 text-[15px]">
                No results found. Try “solitaire”, “halo” or “oval”.
              </p>
            ) : null}
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
