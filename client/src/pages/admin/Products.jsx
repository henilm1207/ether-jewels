import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, RefreshCw, Pencil, Archive, Trash2 } from 'lucide-react';
import { adminFetch, adminDownload } from '../../components/admin/api';
import { resolveMediaUrl } from '../../lib/media';
import { PageHead, Table, td, Pill, ErrorMsg, RowIconButton, MultiSelectDropdown, SHAPE_NAMES, DIAMOND_COLORS, DIAMOND_CLARITY } from '../../components/admin/ui';

// Matches exactly what server buildSort() implements (routes/products.js) —
// offering more would silently do nothing on the picked value.
const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name-asc', label: 'Name, A-Z' },
  { value: 'name-desc', label: 'Name, Z-A' },
];

const emptyFilters = { category: '', shapes: [], diamondColors: [], clarities: [], priceFrom: '', priceTo: '', inStock: '', stale: false, missingSeo: false, missingCert: false, sort: '' };

export default function Products() {
  const [searchParams] = useSearchParams();
  // Deep links from the Dashboard's low-stock / incomplete-listing / stale
  // widgets (?inStock=false, ?missingSeo=true, ?missingCert=true, ?stale=true)
  // seed the initial filter state — no dedicated checkboxes for the last two
  // (see the "Showing:" banner below instead), so they only apply once, on load.
  const initialFilters = {
    ...emptyFilters,
    inStock: searchParams.get('inStock') || '',
    stale: searchParams.get('stale') === 'true',
    missingSeo: searchParams.get('missingSeo') === 'true',
    missingCert: searchParams.get('missingCert') === 'true',
  };
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [categories, setCategories] = useState([]);
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState(null);

  useEffect(() => {
    adminFetch('/api/categories/admin/all').then(setCategories).catch(() => {});
    adminFetch('/api/pricing-settings').then((s) => setSettingsUpdatedAt(s.updatedAt)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      if (filters.category) params.set('category', filters.category);
      if (filters.shapes.length) params.set('shape', filters.shapes[0]); // server matches one shape per call; refine below client-side for multi
      if (filters.diamondColors.length) params.set('color', filters.diamondColors[0]);
      if (filters.clarities.length) params.set('clarity', filters.clarities[0]);
      if (filters.priceFrom !== '') params.set('minPrice', filters.priceFrom);
      if (filters.priceTo !== '') params.set('maxPrice', filters.priceTo);
      if (filters.inStock !== '') params.set('inStock', filters.inStock);
      if (filters.stale) params.set('stale', 'true');
      if (filters.missingSeo) params.set('missingSeo', 'true');
      if (filters.missingCert) params.set('missingCert', 'true');
      if (filters.sort) params.set('sort', filters.sort);
      const data = await adminFetch(`/api/products/admin/all?${params}`);
      let list = data.items;
      // Multi-select shape/color/clarity narrow further client-side (server
      // filter above already applied the first pick, so this only trims
      // when the admin picked more than one value for the same facet).
      if (filters.shapes.length > 1) list = list.filter((p) => filters.shapes.some((s) => [p.shape, ...(p.shapes || [])].includes(s)));
      if (filters.diamondColors.length > 1) list = list.filter((p) => filters.diamondColors.some((c) => (p.diamondColors || []).includes(c)));
      if (filters.clarities.length > 1) list = list.filter((p) => filters.clarities.some((c) => (p.clarity || []).includes(c)));
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        list = list.filter((p) =>
          [p.name, p.slug, p.styleCode, p.category].filter(Boolean).join(' ').toLowerCase().includes(needle)
        );
      }
      setItems(list);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, q, filters]);

  useEffect(() => { load(); }, [load]);

  const [exporting, setExporting] = useState(false);
  const [alibabaTier, setAlibabaTier] = useState('10KT');
  const exportAlibaba = async (all = false, ids = null) => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ tier: alibabaTier });
      if (all) params.set('all', 'true');
      if (ids && ids.length) params.set('ids', ids.join(','));
      await adminDownload(`/api/products/admin/export/alibaba?${params}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };
  const [exportingCsv, setExportingCsv] = useState(false);
  const exportCsv = async (ids) => {
    setExportingCsv(true);
    setError('');
    try {
      await adminDownload(ids ? `/api/products/admin/export/csv?ids=${ids.join(',')}` : '/api/products/admin/export/csv');
    } catch (e) {
      setError(e.message);
    } finally {
      setExportingCsv(false);
    }
  };

  const [deleting, setDeleting] = useState(null); // product pending type-to-confirm
  const [confirmText, setConfirmText] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);

  const archive = async (p) => {
    if (!window.confirm(`Archive "${p.name}"? It will disappear from the store.`)) return;
    try {
      await adminFetch(`/api/products/${p._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const destroy = async (e) => {
    e.preventDefault();
    if (!deleting || confirmText.trim() !== deleting.slug) return;
    setDeletingBusy(true);
    try {
      const res = await adminFetch(`/api/products/${deleting._id}/permanent`, { method: 'DELETE' });
      setDeleting(null);
      setConfirmText('');
      setError('');
      load();
      if (res.failed && res.failed.length) {
        setError(`Deleted, but ${res.failed.length} image(s) need manual removal from the server uploads folder.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingBusy(false);
    }
  };

  // Bulk row selection (this page only) + bulk toolbar.
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toggleOne = (id) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allOnPageSelected = items.length > 0 && items.every((p) => selected.has(p._id));
  const toggleAllOnPage = () => setSelected((s) => {
    const n = new Set(s);
    if (allOnPageSelected) items.forEach((p) => n.delete(p._id));
    else items.forEach((p) => n.add(p._id));
    return n;
  });
  const bulkAction = async (action) => {
    if (selected.size === 0) return;
    if (action === 'archive' && !window.confirm(`Archive ${selected.size} product(s)? They'll disappear from the store.`)) return;
    setBulkBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/products/admin/bulk', { method: 'PATCH', body: { ids: [...selected], action } });
      setSelected(new Set());
      load();
      if (res.failed?.length) setError(`${res.failed.length} product(s) failed: ${res.failed.map((f) => f.name).join(', ')}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const isStale = (p) =>
    p.autoPriced &&
    settingsUpdatedAt &&
    (!p.details?.pricedAt || new Date(p.details.pricedAt) < new Date(settingsUpdatedAt));

  const shapeOptions = SHAPE_NAMES.map((s) => ({ value: s, label: s }));
  const colorOptions = DIAMOND_COLORS.map((c) => ({ value: c, label: c }));
  const clarityOptions = DIAMOND_CLARITY.map((c) => ({ value: c, label: c }));
  const categoryOptions = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const hasActiveFilters = Object.entries(filters).some(([k, v]) => (Array.isArray(v) ? v.length > 0 : v !== emptyFilters[k]));

  return (
    <div>
      <PageHead
        title="Products"
        sub={`${total} total`}
        action={
          <div className="flex gap-3">
            <select
              value={alibabaTier}
              onChange={(e) => setAlibabaTier(e.target.value)}
              title="Karat tier to export for Alibaba"
              aria-label="Karat tier to export for Alibaba"
              className="bg-white border border-[#d9d9d9] rounded text-xs px-2"
              style={{ height: '40px' }}
            >
              <option value="10KT">10KT</option>
              <option value="14KT">14KT</option>
              <option value="18KT">18KT</option>
            </select>
            <button
              onClick={() => exportAlibaba(false)}
              disabled={exporting}
              title={exporting ? 'Exporting…' : `Export new products for Alibaba at ${alibabaTier} (products already exported at ${alibabaTier} are skipped)`}
              aria-label={exporting ? 'Exporting…' : `Export new products for Alibaba (${alibabaTier})`}
              className="bg-white border border-[#d9d9d9] rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 text-xs px-3 gap-2"
              style={{ height: '40px' }}
            >
              <Download size={16} className={exporting ? 'animate-pulse' : ''} />
              Export New (Alibaba)
            </button>
            <button
              onClick={() => exportAlibaba(true)}
              disabled={exporting}
              title={exporting ? 'Exporting…' : `Export ALL products for Alibaba at ${alibabaTier} (re-lists everything at this tier, including already-exported ones)`}
              aria-label={exporting ? 'Exporting…' : `Export all products for Alibaba (${alibabaTier})`}
              className="bg-white border border-[#d9d9d9] rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 text-xs px-3 gap-2"
              style={{ height: '40px' }}
            >
              <RefreshCw size={16} className={exporting ? 'animate-pulse' : ''} />
              Export All (Alibaba)
            </button>
            <Link to="/admin/products/new" className="btn btn--primary text-sm">+ New product</Link>
          </div>
        }
      />
      <ErrorMsg error={error} />

      <div className="flex flex-wrap gap-3 mb-3">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search name, slug, SKU…"
          className="bg-white border border-[#d9d9d9] rounded text-sm"
          style={{ padding: '10px 12px', minWidth: '220px' }}
          aria-label="Search products"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilter({ category: e.target.value })} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Filter by category">
          <option value="">All categories</option>
          {categoryOptions.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
        <div style={{ minWidth: '160px' }}>
          <MultiSelectDropdown options={shapeOptions} values={filters.shapes} onChange={(v) => setFilter({ shapes: v })} placeholder="Any shape" />
        </div>
        <div style={{ minWidth: '160px' }}>
          <MultiSelectDropdown options={colorOptions} values={filters.diamondColors} onChange={(v) => setFilter({ diamondColors: v })} placeholder="Any color" />
        </div>
        <div style={{ minWidth: '160px' }}>
          <MultiSelectDropdown options={clarityOptions} values={filters.clarities} onChange={(v) => setFilter({ clarities: v })} placeholder="Any clarity" />
        </div>
        <select value={filters.inStock} onChange={(e) => setFilter({ inStock: e.target.value })} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Filter by stock">
          <option value="">In &amp; out of stock</option>
          <option value="true">In stock</option>
          <option value="false">Out of stock</option>
        </select>
        <select value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })} className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '10px 12px' }} aria-label="Sort">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <input type="number" min="0" value={filters.priceFrom} onChange={(e) => setFilter({ priceFrom: e.target.value })} placeholder="Min $" className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '8px 10px', width: '100px' }} aria-label="Min price" />
        <span className="text-gray-400">–</span>
        <input type="number" min="0" value={filters.priceTo} onChange={(e) => setFilter({ priceTo: e.target.value })} placeholder="Max $" className="bg-white border border-[#d9d9d9] rounded text-sm" style={{ padding: '8px 10px', width: '100px' }} aria-label="Max price" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={filters.stale} onChange={(e) => setFilter({ stale: e.target.checked })} />
          Stale pricing only
        </label>
        {(filters.missingSeo || filters.missingCert) && (
          <span className="text-amber-800 bg-amber-100 rounded px-2 py-1">
            Showing: {[filters.missingSeo && 'missing SEO', filters.missingCert && 'missing certification'].filter(Boolean).join(', ')}
          </span>
        )}
        {hasActiveFilters && (
          <button onClick={() => { setFilters(emptyFilters); setPage(1); }} className="underline text-gray-500">Clear filters</button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-[#f5f5f5] border border-[#e5e5e5] rounded text-sm" style={{ padding: '10px 14px' }}>
          <span className="font-medium">{selected.size} selected</span>
          <button onClick={() => bulkAction('feature')} disabled={bulkBusy} className="underline disabled:opacity-40">Feature</button>
          <button onClick={() => bulkAction('unfeature')} disabled={bulkBusy} className="underline disabled:opacity-40">Unfeature</button>
          <button onClick={() => bulkAction('archive')} disabled={bulkBusy} className="underline text-red-700 disabled:opacity-40">Archive</button>
          <button onClick={() => exportCsv([...selected])} disabled={bulkBusy || exportingCsv} className="underline disabled:opacity-40">Export selected CSV</button>
          <button
            onClick={() => exportAlibaba(false, [...selected])}
            disabled={bulkBusy || exporting}
            title={`Export exactly these products for Alibaba at ${alibabaTier}, even if already exported at this tier`}
            className="underline disabled:opacity-40"
          >
            Export selected (Alibaba {alibabaTier})
          </button>
          <button onClick={() => setSelected(new Set())} className="underline text-gray-500 ml-auto">Clear selection</button>
        </div>
      )}

      <Table head={[
        <input key="all" type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Select all on page" />,
        'Product', 'Category', 'Price', 'Status', 'Stock', '',
      ]}>
        {loading ? (
          <tr><td colSpan={7} style={td}>Loading…</td></tr>
        ) : items.length === 0 ? (
          <tr><td colSpan={7} style={td}>No products found.</td></tr>
        ) : items.map((p) => (
          <tr key={p._id}>
            <td style={td}><input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleOne(p._id)} aria-label={`Select ${p.name}`} /></td>
            <td style={td}>
              <div className="flex items-center gap-3">
                {p.images?.[0] && <img src={resolveMediaUrl(p.images[0])} alt="" width={40} height={40} className="object-cover rounded flex-shrink-0" />}
                <div>
                  <Link to={`/admin/products/${p._id}`} className="font-medium underline">{p.name}</Link>
                  <p className="text-xs text-gray-500">{p.slug}{p.styleCode ? ` · ${p.styleCode}` : ''}</p>
                </div>
              </div>
            </td>
            <td style={td}>{p.category}</td>
            <td style={td}>
              ${Number(p.price).toFixed(2)}
              {isStale(p) && (
                <span title="Priced before the last gold/diamond rate change — recompute in Pricing" className="inline-block text-xs font-medium rounded px-1.5 py-0.5 ml-2 bg-amber-100 text-amber-800">stale</span>
              )}
            </td>
            <td style={td}><Pill value={p.status} /></td>
            <td style={td}>{p.inStock ? (p.stockQty ?? '—') : 'out'}</td>
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
              <div className="flex items-center gap-1">
                <RowIconButton to={`/admin/products/${p._id}`} icon={Pencil} label="Edit" />
                {p.status !== 'archived' && (
                  <RowIconButton icon={Archive} label="Archive" tone="danger" onClick={() => archive(p)} />
                )}
                <RowIconButton icon={Trash2} label="Delete forever" tone="danger" onClick={() => { setDeleting(p); setConfirmText(''); setError(''); }} />
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <div className="flex items-center gap-3 mt-4 text-sm">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="underline disabled:opacity-40">← Prev</button>
        <span>Page {page}</span>
        <button disabled={items.length < 20} onClick={() => setPage((p) => p + 1)} className="underline disabled:opacity-40">Next →</button>
      </div>

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: '16px' }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => !deletingBusy && setDeleting(null)} />
          <form onSubmit={destroy} className="relative bg-white rounded w-full" style={{ maxWidth: '440px', padding: '20px' }}>
            <h2 className="font-heading text-red-700">Delete forever?</h2>
            <p className="text-sm mt-2">
              <strong>{deleting.name}</strong> will be permanently removed and its uploaded images deleted.
              Reviews stay as history. This cannot be undone — archiving hides it reversibly instead.
            </p>
            <label className="block text-sm mt-3">
              Type <span className="font-mono font-medium">{deleting.slug}</span> to confirm:
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full bg-white border border-[#d9d9d9] rounded text-sm font-mono"
                style={{ padding: '10px 12px' }}
                autoFocus
                autoComplete="off"
              />
            </label>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={deletingBusy || confirmText.trim() !== deleting.slug}
                className="btn btn--primary text-sm disabled:opacity-40 inline-flex items-center gap-2"
                style={{ background: '#B00020' }}
              >
                <Trash2 size={14} />
                {deletingBusy ? 'Deleting…' : 'Delete forever'}
              </button>
              <button type="button" onClick={() => setDeleting(null)} disabled={deletingBusy} className="underline text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
