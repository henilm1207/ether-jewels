// Shared Suspense fallback for lazy-loaded routes (storefront pages and the
// admin panel both use this — one place instead of copy-pasting the markup).
export default function RouteFallback() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '50vh' }} role="status" aria-live="polite">
      <p className="text-[15px]" style={{ color: '#888' }}>Loading…</p>
    </div>
  );
}
