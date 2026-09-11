import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../config';

// /collections — every collection in one place (Jewellery top link lands here).
export default function Collections() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/categories'));
        if (!res.ok) throw new Error('Could not load collections.');
        const data = await res.json();
        if (live) setCats(Array.isArray(data) ? data : []);
      } catch (e) {
        if (live) setLoadError(e.message || 'Could not load collections.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const variants = cats.filter((c) => c.parent === 'Collection' && !c.aliasOf && !c.shape);

  return (
    <section>
      <div className="border-t border-[#ededed]" />
      <div className="container text-center" style={{ paddingTop: '30px', paddingBottom: '30px' }}>
        <p className="text-subheading" style={{ marginBottom: '12px' }}>Catalogue</p>
        <h1
          className="font-heading"
          style={{ fontSize: 'clamp(32px, 5vw, 64px)', lineHeight: 1.2, marginBottom: 0 }}
        >
          Jewellery
        </h1>
        <p
          className="mx-auto"
          style={{ marginTop: '12px', maxWidth: '76rem', fontSize: '15px', lineHeight: 1.7, color: '#222', opacity: 0.8 }}
        >
          Every collection, in one place. Choose a world to explore.
        </p>
      </div>

      <div className="container" style={{ paddingBottom: '64px' }}>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse bg-[#f1ece8] aspect-[4/3]" />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center" style={{ padding: '40px 0' }}>
            <p className="text-gray-600 text-[15px]" style={{ marginBottom: '16px' }}>{loadError}</p>
            <button onClick={() => window.location.reload()} className="btn btn--secondary">Retry</button>
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center" style={{ padding: '40px 0' }}>
            <h2 className="font-heading text-2xl mb-4">New collections coming soon</h2>
            <p className="text-gray-600 text-[15px]">We are preparing something brilliant. Check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {variants.map((c) => (
              <Link
                key={c.key}
                to={`/collections/${c.key}`}
                className="group block bg-[#f7f2ef] hover:opacity-90 transition-opacity"
              >
                {c.image ? (
                  <img src={c.image} alt={c.name} loading="lazy" className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] flex items-center justify-center bg-[#f7f2ef]">
                    <span className="font-heading" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>{c.name}</span>
                  </div>
                )}
                <div className="text-center" style={{ padding: '20px 16px' }}>
                  <h2 className="font-heading group-hover:underline underline-offset-4" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                    {c.name}
                  </h2>
                  {c.description && (
                    <p className="text-sm text-gray-600" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.description}
                    </p>
                  )}
                  <span className="inline-block text-[13px] font-medium uppercase underline underline-offset-4" style={{ letterSpacing: '1px', marginTop: '12px' }}>
                    Shop now
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
