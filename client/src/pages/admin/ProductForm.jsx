import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminFetch } from '../../components/admin/api';
import AiCopyButton from '../../components/admin/AiCopyButton';
import { PageHead, Card, Field, inputCls, inputStyle, ErrorMsg, SHAPE_NAMES, RING_SIZES, isRingCategory } from '../../components/admin/ui';

const EMPTY = {
  name: '', slug: '', styleCode: '', shape: '', price: '', kt18Delta: 200,
  compareAtPrice: '', description: '', shortDescription: '', category: '',
  images: [], video: '', tags: '', badge: '', status: 'draft',
  inStock: true, stockQty: 10, featured: false, sizes: [], defaultSize: '',
  sideStoneCertified: false, deliveryDays: 30, metalWeightGrams: '', makingCharges: '',
  seoTitle: '', seoDesc: '',
};
const EMPTY_VARIANT = { name: '', material: '', color: '#E0BFB8', price: '', inStock: true };

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

// Product image manager: file upload (Cloudinary) + paste-URL fallback.
function ImageManager({ images, setImages, setError }) {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [configured, setConfigured] = useState(true);

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
      if (e.message.includes('not configured')) setConfigured(false);
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

  // Removing from the form also frees the file in Cloudinary (if ours).
  // Best-effort: the image is dropped from the product regardless.
  const removeAt = async (i) => {
    const src = images[i];
    setImages(images.filter((_, x) => x !== i));
    const m = String(src || '').match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    const publicId = m && m[1];
    if (publicId && publicId.startsWith('ether-jewels/')) {
      try {
        await adminFetch('/api/uploads', { method: 'DELETE', body: { publicId } });
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
            <img src={src} alt={`Product image ${i + 1}`} className="w-full aspect-square object-cover" loading="lazy" />
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
      {configured ? (
        <label className="block border border-dashed border-[#bbb] rounded text-center text-sm cursor-pointer hover:border-[#222]" style={{ padding: '16px' }}>
          {uploading ? 'Uploading…' : 'Drop images here or click to upload (JPG/PNG/WebP, ≤5MB each, max 8)'}
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </label>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded" style={{ padding: '8px 10px', marginBottom: '8px' }}>
          Cloud uploads not configured on the server — paste image URLs below instead.
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste image URL…" className={inputCls} style={inputStyle} aria-label="Image URL" />
        <button type="button" onClick={() => { if (url.trim()) { setImages([...images, url.trim()]); setUrl(''); } }} className="flex-shrink-0 underline text-sm">Add URL</button>
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
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setImages = (images) => setForm((f) => ({ ...f, images }));

  useEffect(() => {
    adminFetch('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

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
          defaultSize: p.defaultSize || '',
          video: p.video || '',
          styleCode: p.styleCode || '',
          seoTitle: p.seoTitle || '',
          seoDesc: p.seoDesc || '',
        });
        setVariants(p.variants?.length ? p.variants.map((v) => ({ ...EMPTY_VARIANT, ...v, price: String(v.price ?? '') })) : [{ ...EMPTY_VARIANT }]);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const ring = isRingCategory(form.category);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSavedNote('');
    if (!form.images.length) return setError('Add at least one product image.');
    if (!variants.length) return setError('Add at least one metal variant.');
    setSaving(true);
    try {
      const num = (v) => (v === '' || v == null ? undefined : Number(v));
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        styleCode: form.styleCode.trim() || undefined,
        shape: form.shape || null,
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
          color: v.color || '',
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
                  <select value={form.category} onChange={(e) => set('category', e.target.value)} required className={inputCls} style={inputStyle}>
                    <option value="">Select…</option>
                    {categories.filter((c) => !c.aliasOf && !c.shape && !(c.aggregateKeys && c.aggregateKeys.length)).map((c) => (
                      <option key={c.key} value={c.key}>{c.name} ({c.key})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Diamond shape">
                  <select value={form.shape} onChange={(e) => set('shape', e.target.value)} className={inputCls} style={inputStyle}>
                    <option value="">None (band)</option>
                    {SHAPE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border-b border-[#f0f0f0]" style={{ paddingBottom: '10px', marginBottom: '10px' }}>
                  <Field label="Name"><input value={v.name} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))} placeholder="Rose Gold" required className={inputCls} style={inputStyle} /></Field>
                  <Field label="Material"><input value={v.material} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, material: e.target.value } : x))} placeholder="Rose Gold" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Swatch"><input type="color" value={v.color || '#E0BFB8'} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, color: e.target.value } : x))} className="w-full" style={{ height: '42px' }} /></Field>
                  <Field label="Price"><input type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, price: e.target.value } : x))} required className={inputCls} style={inputStyle} /></Field>
                  <Field label="Stock">
                    <label className="flex items-center gap-2 text-sm" style={{ height: '42px' }}>
                      <input type="checkbox" checked={!!v.inStock} onChange={(e) => setVariants(variants.map((x, xi) => xi === i ? { ...x, inStock: e.target.checked } : x))} /> In stock
                    </label>
                  </Field>
                  <button type="button" onClick={() => setVariants(variants.filter((_, xi) => xi !== i))} disabled={variants.length <= 1} className="underline text-sm text-red-700 disabled:opacity-30" style={{ paddingBottom: '22px' }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setVariants([...variants, { name: '', material: '', color: '#E0BFB8', price: '', inStock: true }])} className="underline text-sm">+ Add variant</button>
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
                shape={form.shape}
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
          </div>
        </div>
      </form>
    </div>
  );
}
