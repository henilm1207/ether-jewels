import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminFetch } from '../../components/admin/api';
import { resolveMediaUrl, localFilename } from '../../lib/media';
import AiCopyButton from '../../components/admin/AiCopyButton';
import { clearMenuCache } from '../../lib/categoryTree';
import { VARIANTS, SUBS, RING_LEAVES } from '../../data/catalog';
import { METALS, metalColor, DEFAULT_METAL } from '../../lib/metals';
import { PageHead, Card, Field, inputCls, inputStyle, ErrorMsg, SHAPE_NAMES, DIAMOND_COLORS, DIAMOND_CLARITY, RING_SIZES, isRingCategory } from '../../components/admin/ui';

const EMPTY = {
  name: '', slug: '', styleCode: '', shape: '', shapes: [], diamondColors: [], clarity: [], price: '', kt18Delta: 200,
  compareAtPrice: '', description: '', shortDescription: '', category: '',
  images: [], video: '', tags: '', badge: '', status: 'draft',
  inStock: true, stockQty: 10, featured: false, sizes: [], defaultSize: '',
  sideStoneCertified: false, deliveryDays: 30, metalWeightGrams: '', makingCharges: '',
  seoTitle: '', seoDesc: '',
  alibabaEnabled: false, alibabaUnit: 'Piece/Pieces', alibabaCategory: '',
  alibabaOrigin: '', alibabaLeadTimeDays: '', alibabaGrossWeightKg: '',
  alibabaAttr1Name: '', alibabaAttr1Value: '', alibabaAttr2Name: '', alibabaAttr2Value: '',
  alibabaAttr3Name: '', alibabaAttr3Value: '', alibabaAttr4Name: '', alibabaAttr4Value: '',
  alibabaAttr5Name: '', alibabaAttr5Value: '',
};
const EMPTY_VARIANT = { name: '', material: '', color: DEFAULT_METAL.swatch, price: '', inStock: true };

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

// Product image manager: file upload (local /uploads, watermarked WebP)
// + paste-URL fallback for external https images.
function ImageManager({ images, setImages, setError }) {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const addFiles = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      list.slice(0, 8).forEach((f) => form.append('images', f));
      const data = await adminFetch('/api/uploads', { method: 'POST', form });
      setImages([...images, ...data.files.map((f) => f.url)]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const move = (i, dir) => {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  };

  // Removing from the form also deletes the local file (if ours).
  // Best-effort: the image is dropped from the product regardless. Only
  // /uploads/YYYY-MM/<uuid>.webp values trigger the delete — external
  // paste-URLs never do.
  const removeAt = async (i) => {
    const src = images[i];
    setImages(images.filter((_, x) => x !== i));
    const filename = localFilename(src);
    if (filename) {
      try {
        await adminFetch('/api/uploads', { method: 'DELETE', body: { filename } });
      } catch {
        // already deleted or unreachable — product data is still correct
      }
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="relative border border-[#e5e5e5] rounded overflow-hidden bg-gray-50">
            <img src={resolveMediaUrl(src)} alt={`Product image ${i + 1}`} className="w-full aspect-square object-cover" loading="lazy" />
            {i === 0 && <span className="absolute top-1 left-1 text-[10px] font-medium bg-[#222] text-white rounded px-1.5 py-0.5">COVER</span>}
            <div className="flex justify-between text-xs" style={{ padding: '4px 6px' }}>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="underline disabled:opacity-30">←</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="underline disabled:opacity-30">→</button>
              <button type="button" onClick={() => removeAt(i)} className="underline text-red-700">Remove</button>
            </div>
          </div>
        ))}
      </div>
      {images.length === 0 && <p className="text-sm text-red-700 mb-2">At least one image is required.</p>}
      <label className="block border border-dashed border-[#bbb] rounded text-center text-sm cursor-pointer hover:border-[#222]" style={{ padding: '16px' }}>
        {uploading ? 'Uploading…' : 'Drop images here or click to upload (JPG/PNG/WebP, ≤5MB each, max 8)'}
        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </label>
      <div className="flex gap-2 mt-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste image URL (https://…)…" className={inputCls} style={inputStyle} aria-label="Image URL" />
        <button type="button" onClick={() => { const u = url.trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) { setError('Image URL must start with http(s)://'); return; } setImages([...images, u]); setUrl(''); }} className="flex-shrink-0 underline text-sm">Add URL</button>
      </div>
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }]);
  const [categories, setCategories] = useState([]);
  const [variantKey, setVariantKey] = useState(''); // selected variant (Category dropdown)
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [qa, setQa] = useState(null); // { kind: 'variant'|'sub', name: '' } | null
  const [qaSaving, setQaSaving] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState('');
  const [destroying, setDestroying] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setImages = (images) => setForm((f) => ({ ...f, images }));
  // Grade multi-selects (diamond color / clarity): toggle + keep scale order
  // (best first) so cards can render compact ranges like D–F.
  const toggleGrade = (key, scale, value) =>
    setForm((f) => {
      const cur = f[key] || [];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      next.sort((a, b) => scale.indexOf(a) - scale.indexOf(b));
      return { ...f, [key]: next };
    });

  // Variant (Category) options: STATIC list first (always complete), DB extras
  // (quick-added customs) merged in marked with •. Same for sub-categories.
  // Static and DB share the key scheme, so both UIs always agree.
  // A leaf is a real shelf: no alias, no shape mapping, no aggregateKeys.
  const isLeaf = (c) =>
    !!c && !c.aliasOf && !c.shape && !(c.aggregateKeys && c.aggregateKeys.length);
  const dbByKey = {};
  categories.forEach((c) => { dbByKey[c.key] = c; });
  const variantOptions = [
    ...VARIANTS.map((v) => ({ ...(dbByKey[v.key] || {}), key: v.key, name: (dbByKey[v.key] || {}).name || v.name, custom: !dbByKey[v.key] })),
    ...categories
      .filter((c) => c.parent === 'Collection' && !c.aliasOf && !c.shape && !VARIANTS.some((v) => v.key === c.key))
      .map((c) => ({ ...c, custom: true })),
  ];
  const staticSubs = SUBS[variantKey] || [];
  const variantDoc = variantOptions.find((x) => x.key === variantKey);
  const dbSubs = variantDoc && !variantDoc.custom
    ? categories.filter((c) => c.parent === variantDoc.name && !c.aliasOf && !c.shape && c.key !== variantDoc.key && !staticSubs.some((s) => s.key === c.key))
    : [];
  const subOptions = [
    ...staticSubs.map((s) => ({ ...(dbByKey[s.key] || {}), key: s.key, name: (dbByKey[s.key] || {}).name || s.name })),
    ...dbSubs.map((c) => ({ ...c, custom: true })),
  ];
  const storedDoc = categories.find((c) => c.key === form.category);
  // Static leaves count as valid shelves for UI gating; the server leaf-guard
  // is the final judge at save time (it needs the matching DB doc).
  const inStatic = Object.values(SUBS).some((arr) => arr.some((s) => s.key === form.category));
  const leafDoc = storedDoc && isLeaf(storedDoc) ? storedDoc : null;
  const staleCategory = form.category && !leafDoc && !inStatic;
  const storedIsAggregate = !!(storedDoc && storedDoc.aggregateKeys && storedDoc.aggregateKeys.length);
  // Ring sizes follow the DB category flag (custom ring leaves work too).
  // Inline quick-add: new variant (parent Collection) or new sub under the
  // chosen variant — no page leave, form data preserved.
  const quickAdd = async (e) => {
    e.preventDefault();
    if (!qa || !qa.name.trim()) return;
    const variantDoc = variantOptions.find((x) => x.key === variantKey);
    if (qa.kind === 'sub' && !variantDoc) {
      setError('Pick a category first, then add its sub-category.');
      return;
    }
    setQaSaving(true);
    setError('');
    try {
      const created = await adminFetch('/api/categories', {
        method: 'POST',
        body: {
          name: qa.name.trim(),
          parent: qa.kind === 'variant' ? 'Collection' : variantDoc.name,
          ...(qa.kind === 'variant' ? { requiresSize: false } : {}),
        },
      });
      const list = await adminFetch('/api/categories');
      setCategories(Array.isArray(list) ? list : []);
      clearMenuCache(); // new shelves appear in menus immediately
      if (qa.kind === 'variant') {
        setVariantKey(created.key);
        set('category', '');
      } else {
        set('category', created.key);
      }
      setQa(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setQaSaving(false);
    }
  };

  useEffect(() => {
    adminFetch('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  // Once categories arrive, point the Category dropdown at the variant that
  // owns the stored leaf (edit mode). Static SUBS entries resolve without DB.
  useEffect(() => {
    if (!form.category || variantKey) return;
    const leafVariantKey = Object.keys(SUBS).find((vk) => SUBS[vk].some((s) => s.key === form.category));
    if (leafVariantKey) {
      setVariantKey(leafVariantKey);
      return;
    }
    const leaf = categories.find((c) => c.key === form.category);
    if (!leaf) return;
    const v = categories.find((x) => x.parent === 'Collection' && !x.aliasOf && !x.shape && x.name === leaf.parent);
    if (v) setVariantKey(v.key);
  }, [categories, form.category, variantKey]);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const list = await adminFetch('/api/products/admin/all?limit=100');
        const p = list.items.find((x) => x._id === id);
        if (!p) throw new Error('Product not found');
        setForm({
          ...EMPTY,
          ...p,
          price: String(p.price ?? ''),
          kt18Delta: p.kt18Delta ?? 200,
          compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : '',
          stockQty: p.stockQty ?? 10,
          deliveryDays: p.details?.deliveryDays ?? 30,
          metalWeightGrams: p.details?.metalWeightGrams != null ? String(p.details.metalWeightGrams) : '',
          makingCharges: p.details?.makingCharges != null ? String(p.details.makingCharges) : '',
          sideStoneCertified: !!p.details?.sideStoneCertified,
          tags: (p.tags || []).join(', '),
          badge: p.badge || '',
          shape: p.shape || '',
          shapes: Array.isArray(p.shapes) && p.shapes.length ? p.shapes : (p.shape ? [p.shape] : []),
          diamondColors: Array.isArray(p.diamondColors) ? p.diamondColors.filter((c) => DIAMOND_COLORS.includes(c)) : [],
          clarity: Array.isArray(p.clarity) ? p.clarity.filter((c) => DIAMOND_CLARITY.includes(c)) : [],
          defaultSize: p.defaultSize || '',
          video: p.video || '',
          styleCode: p.styleCode || '',
          seoTitle: p.seoTitle || '',
          seoDesc: p.seoDesc || '',
          alibabaEnabled: !!p.alibaba?.enabled,
          alibabaUnit: p.alibaba?.unit || 'Piece/Pieces',
          alibabaCategory: p.alibaba?.category || '',
          alibabaOrigin: p.alibaba?.origin || '',
          alibabaLeadTimeDays: p.alibaba?.leadTimeDays != null ? String(p.alibaba.leadTimeDays) : '',
          alibabaGrossWeightKg: p.alibaba?.grossWeightKg != null ? String(p.alibaba.grossWeightKg) : '',
          alibabaAttr1Name: p.alibaba?.attr1Name || '', alibabaAttr1Value: p.alibaba?.attr1Value || '',
          alibabaAttr2Name: p.alibaba?.attr2Name || '', alibabaAttr2Value: p.alibaba?.attr2Value || '',
          alibabaAttr3Name: p.alibaba?.attr3Name || '', alibabaAttr3Value: p.alibaba?.attr3Value || '',
          alibabaAttr4Name: p.alibaba?.attr4Name || '', alibabaAttr4Value: p.alibaba?.attr4Value || '',
          alibabaAttr5Name: p.alibaba?.attr5Name || '', alibabaAttr5Value: p.alibaba?.attr5Value || '',
        });
        setVariants(p.variants?.length ? p.variants.map((v) => ({ ...EMPTY_VARIANT, ...v, price: String(v.price ?? '') })) : [{ ...EMPTY_VARIANT }]);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  // Ring sizes follow the DB category flag (custom ring leaves work too).
  // Ring sizes: DB flag wins, static ring leaves next, legacy helper last.
  const ring = leafDoc ? !!leafDoc.requiresSize : (RING_LEAVES.has(form.category) || isRingCategory(form.category));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSavedNote('');
    if (!form.images.length) return setError('Add at least one product image.');
    if (!variants.length) return setError('Add at least one metal variant.');
    if (!leafDoc && !inStatic) return setError('Pick a valid category + sub-category before saving.');
    setSaving(true);
    try {
      const num = (v) => (v === '' || v == null ? undefined : Number(v));
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        styleCode: form.styleCode.trim() || undefined,
        shape: (form.shapes || [])[0] || null, // primary = first picked (legacy compat)
        shapes: (form.shapes || []).slice(0, 5),
        diamondColors: (form.diamondColors || []).filter((c) => DIAMOND_COLORS.includes(c)).slice(0, DIAMOND_COLORS.length),
        clarity: (form.clarity || []).filter((c) => DIAMOND_CLARITY.includes(c)).slice(0, DIAMOND_CLARITY.length),
        price: Number(form.price),
        kt18Delta: Number(form.kt18Delta) || 0,
        compareAtPrice: num(form.compareAtPrice),
        description: form.description,
        shortDescription: form.shortDescription,
        category: form.category,
        images: form.images,
        video: form.video.trim() || null,
        variants: variants.map((v) => ({
          name: v.name.trim(),
          material: v.material.trim() || v.name.trim(),
          // Static swatch: always derived from the metal, never hand-picked.
          color: metalColor(v.material || v.name, v.color || DEFAULT_METAL.swatch),
          // Metal photo: PDP gallery jumps to it on swatch select; '' = cover.
          image: (v.image && String(v.image).trim()) || '',
          price: Number(v.price),
          inStock: !!v.inStock,
        })),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        badge: form.badge || null,
        status: form.status,
        inStock: !!form.inStock,
        stockQty: Number(form.stockQty) || 0,
        featured: !!form.featured,
        sizes: ring ? form.sizes : [],
        defaultSize: ring ? form.defaultSize || null : null,
        details: {
          sideStoneCertified: !!form.sideStoneCertified,
          deliveryDays: Number(form.deliveryDays) || 0,
          metalWeightGrams: num(form.metalWeightGrams),
          makingCharges: num(form.makingCharges),
        },
        seoTitle: form.seoTitle.trim() || undefined,
        seoDesc: form.seoDesc.trim() || undefined,
        alibaba: {
          enabled: !!form.alibabaEnabled,
          unit: form.alibabaUnit.trim() || 'Piece/Pieces',
          category: form.alibabaCategory.trim(),
          origin: form.alibabaOrigin.trim(),
          leadTimeDays: num(form.alibabaLeadTimeDays),
          grossWeightKg: num(form.alibabaGrossWeightKg),
          attr1Name: form.alibabaAttr1Name.trim(), attr1Value: form.alibabaAttr1Value.trim(),
          attr2Name: form.alibabaAttr2Name.trim(), attr2Value: form.alibabaAttr2Value.trim(),
          attr3Name: form.alibabaAttr3Name.trim(), attr3Value: form.alibabaAttr3Value.trim(),
          attr4Name: form.alibabaAttr4Name.trim(), attr4Value: form.alibabaAttr4Value.trim(),
          attr5Name: form.alibabaAttr5Name.trim(), attr5Value: form.alibabaAttr5Value.trim(),
        },
      };
      const saved = isNew
        ? await adminFetch('/api/products', { method: 'POST', body })
        : await adminFetch(`/api/products/${id}`, { method: 'PUT', body });
      setSavedNote(isNew ? 'Product created ✓' : 'Changes saved ✓');
      if (isNew) navigate(`/admin/products/${saved._id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div>
      <PageHead title={isNew ? 'New product' : 'Edit product'} sub="Prices are USD, 14KT base — 18KT adds the delta" />
      <ErrorMsg error={error} />
      {staleCategory && (
        <p role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded" style={{ padding: '10px 12px', marginBottom: '14px' }}>
          {storedIsAggregate ? (
            <>“{form.category}” is a collection shelf, not a shelf item — pick its sub-category below, then save.</>
          ) : (
            <>Saved category “{form.category}” no longer exists as a leaf — pick a valid category + sub-category, then save.</>
          )}
        </p>
      )}
      <form onSubmit={save}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name *">
                  <input value={form.name} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} required className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Slug * (URL)" hint="Auto-generated — edit only if you know why">
                  <input value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} required className={inputCls} style={inputStyle} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Category *">
                  <select
                    value={variantKey}
                    onChange={(e) => { setVariantKey(e.target.value); set('category', ''); }}
                    required
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="">Select…</option>
                    {variantOptions.map((c) => (
                      <option key={c.key} value={c.key}>{c.name}{c.custom ? ' •' : ''}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sub-category *">
                  <select
                    value={subOptions.some((s) => s.key === form.category) || leafDoc ? form.category : ''}
                    onChange={(e) => set('category', e.target.value)}
                    required
                    disabled={!variantKey}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="">{variantKey ? (subOptions.length ? 'Select…' : 'No sub-categories — add one below') : 'Pick a category first'}</option>
                    {subOptions.map((c) => (
                      <option key={c.key} value={c.key}>{c.name} ({c.key}){c.custom ? ' •' : ''}</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-4" style={{ paddingBottom: '14px' }}>
                  <button type="button" onClick={() => setQa({ kind: 'variant', name: '' })} className="underline text-sm">+ New category</button>
                  <button type="button" onClick={() => setQa({ kind: 'sub', name: '' })} disabled={!variantKey} className="underline text-sm disabled:opacity-40" title={variantKey ? '' : 'Pick a category first'}>+ New sub-category</button>
                </div>
                {qa && (
                  <form onSubmit={quickAdd} className="sm:col-span-3 flex flex-wrap items-end gap-2 bg-[#fafafa] border border-[#e5e5e5] rounded" style={{ padding: '12px' }}>
                    <p className="text-sm font-medium w-full">
                      New {qa.kind === 'variant' ? 'category' : `sub-category under “${(variantOptions.find((x) => x.key === variantKey) || {}).name || ''}”`}
                    </p>
                    <input
                      value={qa.name}
                      onChange={(e) => setQa({ ...qa, name: e.target.value })}
                      placeholder={qa.kind === 'variant' ? 'e.g. Anklets' : 'e.g. Charm Bands'}
                      required
                      autoFocus
                      className={inputCls}
                      style={{ ...inputStyle, maxWidth: '280px' }}
                      aria-label={qa.kind === 'variant' ? 'New category name' : 'New sub-category name'}
                    />
                    <button type="submit" disabled={qaSaving} className="btn btn--secondary text-sm disabled:opacity-50">
                      {qaSaving ? 'Adding…' : 'Add'}
                    </button>
                    <button type="button" onClick={() => setQa(null)} className="underline text-sm">Cancel</button>
                  </form>
                )}
                <Field label="Diamond shapes (max 5, first = primary)">
                  <div className="grid grid-cols-2 gap-1" role="group" aria-label="Diamond shapes">
                    {SHAPE_NAMES.map((s) => {
                      const on = (form.shapes || []).includes(s);
                      const full = !on && (form.shapes || []).length >= 5;
                      return (
                        <label key={s} className={`flex items-center gap-2 text-sm ${full ? 'opacity-40' : 'cursor-pointer'}`} style={{ padding: '6px 0' }}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={full}
                            onChange={() => {
                              const cur = form.shapes || [];
                              set('shapes', on ? cur.filter((x) => x !== s) : [...cur, s]);
                            }}
                            className="accent-black"
                            style={{ width: '16px', height: '16px' }}
                          />
                          {s}
                        </label>
                      );
                    })}
                  </div>
                  <span className="block text-xs text-gray-400 mt-1">Empty = no shape (bands). Order kept as picked.</span>
                </Field>
                <Field label="Diamond color (D–N)">
                  <div className="grid grid-cols-4 gap-1" role="group" aria-label="Diamond color grades">
                    {DIAMOND_COLORS.map((c) => {
                      const on = (form.diamondColors || []).includes(c);
                      return (
                        <label key={c} className="flex items-center gap-2 text-sm cursor-pointer" style={{ padding: '6px 0' }}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleGrade('diamondColors', DIAMOND_COLORS, c)}
                            className="accent-black"
                            style={{ width: '16px', height: '16px' }}
                          />
                          {c}
                        </label>
                      );
                    })}
                  </div>
                  <span className="block text-xs text-gray-400 mt-1">Empty = no color info. Stored best-first.</span>
                </Field>
                <Field label="Diamond clarity (IF–I3)">
                  <div className="grid grid-cols-2 gap-1" role="group" aria-label="Diamond clarity grades">
                    {DIAMOND_CLARITY.map((c) => {
                      const on = (form.clarity || []).includes(c);
                      return (
                        <label key={c} className="flex items-center gap-2 text-sm cursor-pointer" style={{ padding: '6px 0' }}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleGrade('clarity', DIAMOND_CLARITY, c)}
                            className="accent-black"
                            style={{ width: '16px', height: '16px' }}
                          />
                          {c}
                        </label>
                      );
                    })}
                  </div>
                  <span className="block text-xs text-gray-400 mt-1">Empty = no clarity info. Stored best-first.</span>
                </Field>
                <Field label="SKU / Style code">
                  <input value={form.styleCode} onChange={(e) => set('styleCode', e.target.value)} placeholder="MJ72R" className={inputCls} style={inputStyle} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="14KT base price (USD) *">
                  <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} required className={inputCls} style={inputStyle} />
                </Field>
                <Field label="18KT delta (USD)">
                  <input type="number" min="0" step="0.01" value={form.kt18Delta} onChange={(e) => set('kt18Delta', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Compare-at price">
                  <input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
              </div>
              <Field label="Short description">
                <input value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Video URL (optional)">
                <input value={form.video} onChange={(e) => set('video', e.target.value)} placeholder="https://…" className={inputCls} style={inputStyle} />
              </Field>
            </Card>

            <div style={{ height: '16px' }} />
            <Card>
              <h2 className="font-medium text-sm mb-3">METAL VARIANTS (min 1) *</h2>
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end border-b border-[#f0f0f0]" style={{ paddingBottom: '10px', marginBottom: '10px' }}>
                  <Field label="Name"><input value={v.name} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))} placeholder="Rose Gold" required className={inputCls} style={inputStyle} /></Field>
                  <Field label="Material">
                    <select
                      value={v.material}
                      onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, material: e.target.value, color: metalColor(e.target.value) } : x))}
                      required
                      className={inputCls}
                      style={inputStyle}
                    >
                      <option value="">Select…</option>
                      {METALS.map((m) => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                      {v.material && !METALS.some((m) => m.name === v.material) && (
                        <option value={v.material}>{v.material} (custom)</option>
                      )}
                    </select>
                  </Field>
                  <Field label="Swatch (auto)">
                    <span
                      aria-label={`Swatch for ${v.material || v.name || 'metal'}: ${metalColor(v.material || v.name, v.color)}`}
                      title={metalColor(v.material || v.name, v.color)}
                      className="block w-full border border-[#d9d9d9] rounded"
                      style={{ height: '42px', backgroundColor: metalColor(v.material || v.name, v.color) }}
                    />
                  </Field>
                  <Field label="Price"><input type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, price: e.target.value } : x))} required className={inputCls} style={inputStyle} /></Field>
                  <Field label="Photo (auto gallery)">
                    <select
                      value={v.image && form.images.includes(v.image) ? v.image : ''}
                      onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, image: e.target.value } : x))}
                      className={inputCls}
                      style={inputStyle}
                      title={v.image || 'Follows the cover image'}
                    >
                      <option value="">Auto (cover)</option>
                      {form.images.map((src, si) => (
                        <option key={`${src}-${si}`} value={src}>Img {si + 1}{si === 0 ? ' (cover)' : ''}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Stock">
                    <label className="flex items-center gap-2 text-sm" style={{ height: '42px' }}>
                      <input type="checkbox" checked={!!v.inStock} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, inStock: e.target.checked } : x))} /> In stock
                    </label>
                  </Field>
                  <button type="button" onClick={() => setVariants(variants.filter((_, xi) => xi !== i))} disabled={variants.length <= 1} className="underline text-sm text-red-700 disabled:opacity-30" style={{ paddingBottom: '22px' }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setVariants([...variants, { name: '', material: '', color: DEFAULT_METAL.swatch, price: '', inStock: true }])} className="underline text-sm">+ Add variant</button>
            </Card>

            {ring && (
              <>
                <div style={{ height: '16px' }} />
                <Card>
                  <h2 className="font-medium text-sm mb-3">RING SIZES (required for {form.category || 'rings'})</h2>
                  <div className="flex flex-wrap gap-2">
                    {RING_SIZES.map((s) => (
                      <label key={s} className={`text-sm border rounded cursor-pointer ${form.sizes.includes(s) ? 'bg-[#222] text-white border-[#222]' : 'border-[#d9d9d9]'}`} style={{ padding: '8px 12px' }}>
                        <input type="checkbox" className="sr-only" checked={form.sizes.includes(s)} onChange={() => set('sizes', form.sizes.includes(s) ? form.sizes.filter((x) => x !== s) : [...form.sizes, s])} />
                        {s}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3" style={{ maxWidth: '200px' }}>
                    <Field label="Default size">
                      <select value={form.defaultSize} onChange={(e) => set('defaultSize', e.target.value)} className={inputCls} style={inputStyle}>
                        <option value="">None</option>
                        {form.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>
                </Card>
              </>
            )}
          </div>

          <div>
            <Card>
              <h2 className="font-medium text-sm mb-3">IMAGES *</h2>
              <ImageManager images={form.images} setImages={setImages} setError={setError} />
              <AiCopyButton
                images={form.images}
                category={form.category}
                shape={(form.shapes || [])[0] || ''}
                variants={variants}
                current={form}
                onFill={(key, value) => {
                  set(key, value);
                  if (key === 'name' && !slugTouched) set('slug', slugify(value));
                }}
                setError={setError}
              />
            </Card>
            <div style={{ height: '16px' }} />
            <Card>
              <h2 className="font-medium text-sm mb-3">PUBLISHING</h2>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="active">Active (live)</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label="Tags (comma separated)">
                <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="new, bestseller" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Badge">
                <select value={form.badge} onChange={(e) => set('badge', e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">None</option>
                  <option value="new">New</option>
                  <option value="sale">Sale</option>
                  <option value="hot">Hot</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={!!form.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured on home</label>
              <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={!!form.inStock} onChange={(e) => set('inStock', e.target.checked)} /> In stock</label>
              <Field label="Stock qty">
                <input type="number" min="0" value={form.stockQty} onChange={(e) => set('stockQty', e.target.value)} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Delivery days">
                <input type="number" min="0" value={form.deliveryDays} onChange={(e) => set('deliveryDays', e.target.value)} className={inputCls} style={inputStyle} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Metal wt (g)"><input type="number" min="0" step="0.01" value={form.metalWeightGrams} onChange={(e) => set('metalWeightGrams', e.target.value)} className={inputCls} style={inputStyle} /></Field>
                <Field label="Making ₹/$"><input type="number" min="0" step="0.01" value={form.makingCharges} onChange={(e) => set('makingCharges', e.target.value)} className={inputCls} style={inputStyle} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={!!form.sideStoneCertified} onChange={(e) => set('sideStoneCertified', e.target.checked)} /> Side stones certified</label>
              <Field label="SEO title"><input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className={inputCls} style={inputStyle} /></Field>
              <Field label="SEO description"><input value={form.seoDesc} onChange={(e) => set('seoDesc', e.target.value)} className={inputCls} style={inputStyle} /></Field>
              <button type="submit" disabled={saving} className="btn btn--primary w-full disabled:opacity-50">
                {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
              </button>
              {savedNote && <p role="status" className="text-sm text-green-700 mt-2">{savedNote}</p>}
            </Card>
            <div style={{ height: '16px' }} />
            <Card>
              <h2 className="font-medium text-sm mb-3">ALIBABA EXPORT</h2>
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" checked={!!form.alibabaEnabled} onChange={(e) => set('alibabaEnabled', e.target.checked)} /> Include in Alibaba export
              </label>
              <Field label="Category (e.g. Fine Jewelry &gt; Rings)"><input value={form.alibabaCategory} onChange={(e) => set('alibabaCategory', e.target.value)} placeholder="Leave blank for Alibaba AI to assign" className={inputCls} style={inputStyle} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Unit"><input value={form.alibabaUnit} onChange={(e) => set('alibabaUnit', e.target.value)} className={inputCls} style={inputStyle} /></Field>
                <Field label="Origin"><input value={form.alibabaOrigin} onChange={(e) => set('alibabaOrigin', e.target.value)} className={inputCls} style={inputStyle} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Lead time (days)"><input type="number" min="0" value={form.alibabaLeadTimeDays} onChange={(e) => set('alibabaLeadTimeDays', e.target.value)} placeholder={String(form.deliveryDays)} className={inputCls} style={inputStyle} /></Field>
                <Field label="Gross weight (KG)"><input type="number" min="0" step="0.01" value={form.alibabaGrossWeightKg} onChange={(e) => set('alibabaGrossWeightKg', e.target.value)} className={inputCls} style={inputStyle} /></Field>
              </div>
              <p className="text-xs text-gray-500 mb-2">Product attributes (e.g. Metal / 14K Gold, Gemstone / Diamond) — shown to Alibaba buyers, up to 5 pairs.</p>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="grid grid-cols-2 gap-2" style={{ marginBottom: '8px' }}>
                  <input value={form[`alibabaAttr${n}Name`]} onChange={(e) => set(`alibabaAttr${n}Name`, e.target.value)} placeholder={`Attribute ${n} name`} className={inputCls} style={inputStyle} />
                  <input value={form[`alibabaAttr${n}Value`]} onChange={(e) => set(`alibabaAttr${n}Value`, e.target.value)} placeholder={`Attribute ${n} value`} className={inputCls} style={inputStyle} />
                </div>
              ))}
            </Card>
            {!isNew && (
              <>
                <div style={{ height: '16px' }} />
                <Card>
                  <h2 className="font-medium text-sm mb-1 text-red-700">DANGER ZONE</h2>
                  <p className="text-xs text-gray-500 mb-3">Archiving hides the product reversibly. Deleting removes it and deletes its local upload files forever.</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Archive "${form.name}"? It will disappear from the store.`)) return;
                        setError('');
                        try {
                          await adminFetch(`/api/products/${id}`, { method: 'DELETE' });
                          setSavedNote('Archived — product hidden from the store.');
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                      className="underline text-sm text-red-700"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSlug('__ask')}
                      className="underline text-sm text-red-700 font-medium"
                    >
                      Delete forever
                    </button>
                  </div>
                  {confirmSlug && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setDestroying(true);
                        setError('');
                        try {
                          const res = await adminFetch(`/api/products/${id}/permanent`, { method: 'DELETE' });
                          navigate('/admin/products', { replace: true });
                          if (res.failed && res.failed.length) {
                            window.alert(`Deleted, but ${res.failed.length} image(s) need manual removal from the server uploads folder.`);
                          }
                        } catch (err) {
                          setError(err.message);
                          setConfirmSlug('');
                        } finally {
                          setDestroying(false);
                        }
                      }}
                      className="mt-3"
                    >
                      <label className="block text-sm">
                        Type <span className="font-mono font-medium">{form.slug}</span> to confirm permanent deletion:
                        <input
                          value={confirmSlug === '__ask' ? '' : confirmSlug}
                          onChange={(e) => setConfirmSlug(e.target.value)}
                          className="mt-1 w-full bg-white border border-[#d9d9d9] rounded text-sm font-mono"
                          style={{ padding: '10px 12px' }}
                          autoFocus
                          autoComplete="off"
                        />
                      </label>
                      <div className="flex gap-3 mt-3">
                        <button
                          type="submit"
                          disabled={destroying || confirmSlug.trim() !== form.slug}
                          className="text-sm text-white rounded disabled:opacity-40"
                          style={{ padding: '10px 20px', background: '#B00020' }}
                        >
                          {destroying ? 'Deleting…' : 'Delete forever'}
                        </button>
                        <button type="button" onClick={() => setConfirmSlug('')} className="underline text-sm">Cancel</button>
                      </div>
                    </form>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
