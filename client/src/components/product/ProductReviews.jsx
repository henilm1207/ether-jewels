import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../../config';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 6;

function Stars({ value, size = 14 }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <div className="flex gap-1" role="img" aria-label={`Rated ${filled} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i < filled ? '#222' : 'none'}
          stroke="#222"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M12 2l2.94 6.36 6.96.82-5.16 4.73 1.4 6.89L12 17.27 5.86 20.8l1.4-6.89L2.1 9.18l6.96-.82L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="p-1"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill={n <= value ? '#222' : 'none'}
            stroke="#222"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12 2l2.94 6.36 6.96.82-5.16 4.73 1.4 6.89L12 17.27 5.86 20.8l1.4-6.89L2.1 9.18l6.96-.82L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  border: '1px solid #d9d9d9',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '15px',
  color: '#222',
  background: '#fff',
};

export default function ProductReviews({ product }) {
  const { token, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formDone, setFormDone] = useState(false);

  useEffect(() => {
    if (!product?._id) return;
    let live = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/reviews/product/${product._id}?page=1&limit=${PAGE_SIZE}`)
        );
        const data = res.ok ? await res.json() : { items: [], total: 0 };
        if (!live) return;
        setReviews(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setPage(1);
      } catch {
        if (live) {
          setReviews([]);
          setTotal(0);
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [product?._id]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetch(
        apiUrl(`/api/reviews/product/${product._id}?page=${next}&limit=${PAGE_SIZE}`)
      );
      const data = res.ok ? await res.json() : { items: [] };
      setReviews((r) => [...r, ...(Array.isArray(data.items) ? data.items : [])]);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!token) {
      setFormError('Please log in to write a review.');
      return;
    }
    if (!text.trim() || text.trim().length < 3) {
      setFormError('Please write a few words about the piece (3+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product: product._id,
          rating,
          title: title.trim(),
          text: text.trim(),
          location: location.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not submit your review.');
      setFormDone(true);
      setTitle('');
      setText('');
      setLocation('');
      setRating(5);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const avg = Number(product?.ratingAvg) || 0;
  const count = Number(product?.ratingCount) || 0;

  return (
    <section className="bg-white border-t border-[#ededed] section-padding-lg" style={{ paddingTop: '60px' }}>
      <div className="container">
        <div className="section-header">
          <p className="section__subheading">Reviews</p>
          <h2 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', letterSpacing: '1px' }}>
            What Our Clients Say
          </h2>
          {!loading && (
            <div className="flex items-center gap-3 mt-3">
              <Stars value={avg} />
              <p className="text-[14px] text-gray-600">
                {count > 0
                  ? `${avg.toFixed(1)} out of 5 · based on ${count} review${count === 1 ? '' : 's'}`
                  : 'No reviews yet'}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-[#ededed] p-6 bg-white animate-pulse">
                <div className="bg-[#f1ece8]" style={{ height: '14px', width: '40%', marginBottom: '12px' }} />
                <div className="bg-[#f1ece8]" style={{ height: '60px', marginBottom: '12px' }} />
                <div className="bg-[#f1ece8]" style={{ height: '14px', width: '55%' }} />
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((r) => (
                <div key={r._id} className="border border-[#ededed] p-6 bg-white">
                  <div className="mb-3">
                    <Stars value={r.rating} />
                  </div>
                  {r.title && <p className="text-[15px] font-medium mb-2">{r.title}</p>}
                  <p className="text-[14px] text-gray-600 leading-relaxed mb-4">&ldquo;{r.text}&rdquo;</p>
                  <p className="text-[13px] font-medium">
                    {r.name}{' '}
                    {r.location && <span className="text-gray-400 font-normal">— {r.location}</span>}
                  </p>
                </div>
              ))}
            </div>
            {reviews.length < total && (
              <div className="text-center mt-6">
                <button onClick={loadMore} disabled={loadingMore} className="btn btn--secondary disabled:opacity-50">
                  {loadingMore ? 'Loading…' : `Show more reviews (${total - reviews.length} remaining)`}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-[15px] text-gray-600">No reviews yet — be the first to review this piece.</p>
        )}

        {/* Write a review */}
        <div className="border border-[#ededed] bg-[#fafafa] mt-10" style={{ padding: '24px' }}>
          <h3 className="font-heading mb-2" style={{ fontSize: '1.15rem' }}>Write a review</h3>
          {!user ? (
            <p className="text-[15px] text-gray-600">
              Please{' '}
              <Link
                to="/account/login"
                state={{ from: `/products/${product.slug}` }}
                className="underline font-medium text-[#222]"
              >
                log in
              </Link>{' '}
              to share your experience with this piece.
            </p>
          ) : formDone ? (
            <p className="text-[15px] text-green-800" role="status">
              Thank you — your review was submitted and will appear here after moderation.
            </p>
          ) : (
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="sm:col-span-2">
                <span className="block text-xs font-medium uppercase tracking-wider text-gray-600" style={{ marginBottom: '6px' }}>
                  Your rating *
                </span>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium uppercase tracking-wider text-gray-600" style={{ marginBottom: '6px' }}>
                  Headline
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Sums it up in a line"
                  style={inputStyle}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium uppercase tracking-wider text-gray-600" style={{ marginBottom: '6px' }}>
                  Your review *
                </span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  required
                  placeholder="How is the craftsmanship, fit, sparkle…?"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium uppercase tracking-wider text-gray-600" style={{ marginBottom: '6px' }}>
                  Location (optional)
                </span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={100}
                  placeholder="City, Country"
                  style={inputStyle}
                />
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={submitting} className="btn btn--primary disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Submit review'}
                </button>
              </div>
              {formError && (
                <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>
              )}
              <p className="sm:col-span-2 text-[13px] text-gray-500">
                Reviews are published after a quick moderation check.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
