const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const PricingSettings = require('../models/PricingSettings');
const { authRequired, requireAdmin } = require('../middleware/auth');
const { buildAlibabaCsv } = require('../lib/alibabaExport');
const { buildCatalogCsv } = require('../lib/catalogExport');

const router = express.Router();
const ALLOWED_STATUSES = ['active', 'draft', 'archived'];
const LOW_STOCK_THRESHOLD = 3;
const BULK_ACTIONS = ['archive', 'feature', 'unfeature'];
const PRODUCT_FIELDS = [
  'name', 'slug', 'legacySlugs', 'styleCode', 'shape', 'shapes', 'diamondColors', 'clarity', 'price', 'kt18Delta',
  'kt14Delta', 'autoPriced',
  'compareAtPrice', 'description', 'shortDescription', 'category', 'images',
  'video', 'variants', 'tags', 'badge', 'status', 'inStock', 'stockQty',
  'featured', 'sizes', 'defaultSize', 'details', 'seoTitle', 'seoDesc', 'alibaba',
];
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};
const escapeRegExp = (s) => String(s).slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Anti-copy: public list returns card-only fields. Cost/internal fields
// (styleCode/SKU, kt14Delta/kt18Delta, stockQty, metalWeightGrams/diamondCaratWeight,
// legacySlugs, seoDesc, description, video) stay on the slug detail route
// (needed for PDP) or admin routes — bulk list scraping yields no SKU,
// cost breakdown, or SEO copy.
const PUBLIC_LIST_SELECT =
  'name slug price compareAtPrice category shape shapes diamondColors clarity images variants featured badge inStock sizes defaultSize createdAt';

// Products must live in a real (leaf) category — aggregates (e.g. `rings`)
// and aliases match no collection expansion, so such products would be
// purchasable by direct link yet invisible in every collection page.
async function assertLeafCategory(key) {
  const cat = await Category.findOne({ key });
  if (!cat) throw Object.assign(new Error(`Unknown category '${key}'`), { status: 400 });
  if (cat.aliasOf) throw Object.assign(new Error(`'${key}' is an alias of '${cat.aliasOf}' — use the canonical key`), { status: 400 });
  if (cat.aggregateKeys && cat.aggregateKeys.length)
    throw Object.assign(new Error(`'${key}' is an aggregate collection — pick a specific sub-category`), { status: 400 });
  if (cat.shape) throw Object.assign(new Error(`'${key}' is a shape collection — pick a product category`), { status: 400 });
}

function buildSort(sort) {
  switch (sort) {
    case 'price-asc':
      return { price: 1 };
    case 'price-desc':
      return { price: -1 };
    case 'name-asc':
      return { name: 1 };
    case 'name-desc':
      return { name: -1 };
    case 'date-asc':
      return { createdAt: 1 };
    case 'date-desc':
    default:
      return { createdAt: -1 };
  }
}

async function resolveCategory(key) {
  const seen = new Set();
  let cur = String(key);
  for (let i = 0; i < 5; i++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const cat = await Category.findOne({ key: cur, active: true });
    if (!cat) return null;
    if (cat.aliasOf) {
      cur = cat.aliasOf;
      continue;
    }
    return cat;
  }
  return null;
}

// Shared by the public list and the admin list — everything except `status`
// (each caller applies its own: public is always active-only, admin passes
// whatever it was given). Throws { status, message } on bad input so both
// callers can just forward it to their existing catch -> next(e).
async function buildProductFilter(query) {
  const { category, shape, metal, color, clarity, minPrice, maxPrice, search, featured, inStock } = query;
  const filter = {};

  // Shape matches ANY listed shape (multi-shape products) or the legacy primary.
  const shapeOr = (value) => ({ $or: [{ shapes: value }, { shape: value }] });
  if (category && category !== 'all') {
    const cat = await resolveCategory(category);
    if (cat?.aggregateKeys?.length) {
      filter.category = { $in: cat.aggregateKeys };
    } else if (cat?.shape) {
      Object.assign(filter, shapeOr(cat.shape));
    } else if (cat) {
      filter.category = cat.key;
    } else {
      filter.category = String(category);
    }
  }
  const andClauses = [];
  if (shape) andClauses.push(shapeOr(String(shape)));
  // Diamond color / clarity match ANY listed grade (multi-grade products).
  if (color) andClauses.push({ diamondColors: String(color).toUpperCase() });
  if (clarity) andClauses.push({ clarity: String(clarity).toUpperCase() });
  if (featured === 'true') filter.featured = true;
  else if (featured === 'false') filter.featured = false;
  if (inStock === 'true') filter.inStock = true;
  else if (inStock === 'false') filter.inStock = false;
  if (minPrice !== undefined || maxPrice !== undefined) {
    const lo = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : NaN;
    const hi = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : NaN;
    if ((minPrice !== '' && minPrice !== undefined && !Number.isFinite(lo)) || (maxPrice !== '' && maxPrice !== undefined && !Number.isFinite(hi)))
      throw Object.assign(new Error('Invalid price range'), { status: 400 });
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo > hi)
      throw Object.assign(new Error('minPrice must be <= maxPrice'), { status: 400 });
    filter.price = {};
    if (Number.isFinite(lo)) filter.price.$gte = Math.max(0, lo);
    if (Number.isFinite(hi)) filter.price.$lte = Math.max(0, hi);
  }
  if (metal) {
    const safe = escapeRegExp(String(metal).split(' ')[0]);
    andClauses.push({
      $or: [
        { 'variants.material': new RegExp(safe, 'i') },
        { 'variants.name': new RegExp(safe, 'i') },
      ],
    });
  }
  if (andClauses.length) filter.$and = andClauses;
  if (search) filter.$text = { $search: String(search).slice(0, 100) };
  return filter;
}

// GET /api/products?category=&shape=&metal=&color=&clarity=&minPrice=&maxPrice=&search=&featured=&inStock=&sort=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { status, sort, page = '1', limit = '50' } = req.query;

    // Public list is active-only; other statuses need the admin list below.
    if (status && status !== 'active') {
      return res.status(403).json({ message: 'Use admin product list for non-active status' });
    }
    const filter = await buildProductFilter(req.query);
    filter.status = 'active';

    const pgRaw = parseInt(page, 10);
    const limRaw = parseInt(limit, 10);
    const pg = Number.isFinite(pgRaw) ? Math.max(1, pgRaw) : 1;
    // Public cap 50/page (admin keeps 100) — slows full-catalog dumps.
    const lim = Number.isFinite(limRaw) ? Math.min(50, Math.max(1, limRaw)) : 50;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select(PUBLIC_LIST_SELECT)
        .sort(buildSort(sort))
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (error) {
    error.status = error.status || 400;
    next(error);
  }
});

// Admin list (all statuses) — must be before /:slug. Same filters as the
// public list (category/shape/color/clarity/price/metal/featured/inStock),
// plus `status` (any, not just active) and `stale=true` (auto-priced
// products whose stored price predates the last PricingSettings change).
router.get('/admin/all', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { status, stale, missingSeo, missingCert, sort, page = '1', limit = '50' } = req.query;
    const filter = await buildProductFilter(req.query);
    if (status) {
      if (!ALLOWED_STATUSES.includes(String(status)))
        return res.status(400).json({ message: 'Invalid status' });
      filter.status = status;
    }
    if (stale === 'true') {
      const settings = await PricingSettings.findById('global');
      if (settings) {
        filter.autoPriced = true;
        filter.$or = [
          { 'details.pricedAt': null },
          { 'details.pricedAt': { $lt: settings.updatedAt } },
        ];
      }
    }
    // Dashboard "incomplete listing" deep links — mirror the counts in
    // GET /admin/stats below.
    if (missingSeo === 'true') filter.$or = [{ seoTitle: { $in: [null, ''] } }, { seoDesc: { $in: [null, ''] } }];
    if (missingCert === 'true') filter['details.certNumber'] = { $in: [null, ''] };
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort ? buildSort(sort) : { createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    e.status = e.status || 400;
    next(e);
  }
});

// Alibaba.com bulk-upload CSV — must be before /:slug.
// Defaults to only products never exported before AT THIS KARAT TIER, so
// re-downloading after adding new products doesn't re-list ones already
// uploaded to Alibaba as duplicates — while still allowing the same
// products to be exported once per tier (10KT/14KT/18KT) to build out the
// SKU variants of one listing. ?all=true or an explicit ?ids= selection
// bypass that filter for a deliberate re-export.
const ALIBABA_TIER_KEYS = { '10KT': 'kt10', '14KT': 'kt14', '18KT': 'kt18' };
router.get('/admin/export/alibaba', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const tier = ALIBABA_TIER_KEYS[req.query.tier] ? req.query.tier : '10KT';
    const tierKey = ALIBABA_TIER_KEYS[tier];
    const { ids } = req.query;
    const forceAll = req.query.all === 'true' || !!ids;
    const filter = { status: 'active', 'alibaba.enabled': true };
    if (ids) filter._id = { $in: String(ids).split(',').filter(Boolean) };
    if (!forceAll) filter[`alibabaExportedAt.${tierKey}`] = null;
    const products = await Product.find(filter);
    const publicApiBase = process.env.PUBLIC_API_BASE || `${req.protocol}://${req.get('host')}`;
    const csv = buildAlibabaCsv(products, publicApiBase, tier);
    if (products.length) {
      await Product.updateMany(
        { _id: { $in: products.map((p) => p._id) } },
        { $set: { [`alibabaExportedAt.${tierKey}`]: new Date() } }
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="alibaba-products-${tier}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

// General catalog CSV (every field, not the Alibaba template) — optional
// ?ids=a,b,c exports just a selection (bulk-toolbar "Export selected").
router.get('/admin/export/csv', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { ids } = req.query;
    const filter = ids ? { _id: { $in: String(ids).split(',').filter(Boolean) } } : {};
    const products = await Product.find(filter);
    const csv = buildCatalogCsv(products);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="catalog-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

// Dashboard widgets: low-stock list + data-completeness counts. Must be
// before /:slug.
router.get('/admin/stats', authRequired, requireAdmin, async (_req, res, next) => {
  try {
    const settings = await PricingSettings.findById('global');
    const staleFilter = settings
      ? { autoPriced: true, $or: [{ 'details.pricedAt': null }, { 'details.pricedAt': { $lt: settings.updatedAt } }] }
      : { autoPriced: true, 'details.pricedAt': null };
    const [lowStock, missingSeo, missingCert, stale] = await Promise.all([
      Product.find({ status: 'active', inStock: true, stockQty: { $lte: LOW_STOCK_THRESHOLD } })
        .select('name slug stockQty')
        .sort({ stockQty: 1 })
        .limit(20),
      Product.countDocuments({ status: 'active', $or: [{ seoTitle: { $in: [null, ''] } }, { seoDesc: { $in: [null, ''] } }] }),
      Product.countDocuments({ status: 'active', 'details.certNumber': { $in: [null, ''] } }),
      Product.countDocuments(staleFilter),
    ]);
    res.json({ lowStock, missingSeoCount: missingSeo, missingCertCount: missingCert, staleCount: stale });
  } catch (e) {
    next(e);
  }
});

// Bulk row actions from the admin Products list (checkbox multi-select).
// Load-then-save per doc (not updateMany) — same reason as PUT /:id below:
// update validators skip the pre('validate') ring-size guard.
router.patch('/admin/bulk', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { ids, action } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids[] required' });
    if (!BULK_ACTIONS.includes(action)) return res.status(400).json({ message: `action must be one of ${BULK_ACTIONS.join(', ')}` });
    const products = await Product.find({ _id: { $in: ids } });
    const failed = [];
    let updated = 0;
    for (const p of products) {
      try {
        if (action === 'archive') p.status = 'archived';
        else if (action === 'feature') p.featured = true;
        else if (action === 'unfeature') p.featured = false;
        await p.save();
        updated++;
      } catch (e) {
        failed.push({ id: p._id, name: p.name, error: e.message });
      }
    }
    res.json({ updated, failed });
  } catch (e) {
    next(e);
  }
});

// Back-compat: old clients expect a bare array. Keep slug route below.
router.get('/:slug', async (req, res, next) => {
  try {
    const product =
      (await Product.findOne({ slug: req.params.slug, status: 'active' })) ||
      (await Product.findOne({ legacySlugs: req.params.slug, status: 'active' }));
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Admin CRUD
router.post('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const body = pick(req.body, PRODUCT_FIELDS);
    body.currency = 'USD';
    delete body.ratingAvg;
    delete body.ratingCount;
    if (!body.category) return res.status(400).json({ message: 'category required' });
    await assertLeafCategory(String(body.category));
    const product = await Product.create(body);
    res.status(201).json(product);
  } catch (e) {
    if (e && e.code === 11000) {
      e.status = 400;
      e.message = 'Slug or style code already exists';
    } else {
      e.status = e.status || 400;
    }
    next(e);
  }
});

router.put('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const body = pick(req.body, PRODUCT_FIELDS);
    body.currency = 'USD';
    delete body.ratingAvg;
    delete body.ratingCount;
    if (body.category !== undefined) await assertLeafCategory(String(body.category));
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    // Load-then-save (NOT findByIdAndUpdate): update validators skip the
    // pre('validate') ring-size guard, which let ring products go sizeless.
    for (const k of Object.keys(body)) product.set(k, body[k]);
    await product.save();
    res.json(product);
  } catch (e) {
    if (e && e.code === 11000) {
      e.status = 400;
      e.message = 'Slug or style code already exists';
    } else {
      e.status = e.status || 400;
    }
    next(e);
  }
});

router.delete('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Archived', product });
  } catch (e) {
    next(e);
  }
});

// DELETE /:id/permanent — irreversible: removes the product, deletes its
// local /uploads image files, and drops its reviews (no orphaned approved content).
router.delete('/:id/permanent', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const purged = [];
    const failed = [];
    const { normalizeFilename, deleteLocalFile } = require('../lib/localImages');
    for (const src of product.images || []) {
      // Only our local uploads are deleted; external paste-URLs are skipped.
      // The allowlist shape (YYYY-MM/<uuid>.webp) means a pasted lookalike
      // URL can never delete an unrelated file.
      if (!normalizeFilename(String(src || ''))) continue;
      try {
        await deleteLocalFile(String(src));
        purged.push(String(src));
      } catch {
        failed.push(String(src));
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    const Review = require('../models/Review');
    const dropped = await Review.deleteMany({ product: product._id });
    res.json({
      message: `Deleted ${product.name}`,
      purged: purged.length,
      failed,
      reviewsDropped: dropped.deletedCount || 0,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
