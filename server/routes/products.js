const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { authRequired, requireAdmin } = require('../middleware/auth');
const { buildAlibabaCsv } = require('../lib/alibabaExport');

const router = express.Router();
const ALLOWED_STATUSES = ['active', 'draft', 'archived'];
const PRODUCT_FIELDS = [
  'name', 'slug', 'legacySlugs', 'styleCode', 'shape', 'shapes', 'diamondColors', 'clarity', 'price', 'kt18Delta',
  'kt10Delta', 'autoPriced',
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
// (styleCode/SKU, kt18Delta/kt10Delta, stockQty, metalWeightGrams/diamondCaratWeight,
// legacySlugs, seoDesc, description, video) stay on the slug detail route
// (needed for PDP) or admin routes — bulk list scraping yields no SKU,
// cost breakdown, or SEO copy.
const PUBLIC_LIST_SELECT =
  'name slug price compareAtPrice category shape shapes diamondColors clarity images variants featured badge inStock sizes defaultSize';

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

// GET /api/products?category=&shape=&metal=&color=&clarity=&minPrice=&maxPrice=&search=&featured=&sort=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      shape,
      metal,
      color,
      clarity,
      minPrice,
      maxPrice,
      search,
      featured,
      sort,
      status,
      page = '1',
      limit = '50',
    } = req.query;

    // Public list is active-only; other statuses need the admin list below.
    const filter = { status: 'active' };
    if (status && status !== 'active') {
      return res.status(403).json({ message: 'Use admin product list for non-active status' });
    }

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
    if (minPrice !== undefined || maxPrice !== undefined) {
      const lo = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : NaN;
      const hi = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : NaN;
      if ((minPrice !== '' && minPrice !== undefined && !Number.isFinite(lo)) || (maxPrice !== '' && maxPrice !== undefined && !Number.isFinite(hi)))
        return res.status(400).json({ message: 'Invalid price range' });
      if (Number.isFinite(lo) && Number.isFinite(hi) && lo > hi)
        return res.status(400).json({ message: 'minPrice must be <= maxPrice' });
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
    next(error);
  }
});

// Admin list (all statuses) — must be before /:slug
router.get('/admin/all', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const filter = {};
    if (status) {
      if (!ALLOWED_STATUSES.includes(String(status)))
        return res.status(400).json({ message: 'Invalid status' });
      filter.status = status;
    }
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

// Alibaba.com bulk-upload CSV — must be before /:slug.
router.get('/admin/export/alibaba', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const products = await Product.find({ status: 'active', 'alibaba.enabled': true });
    const publicApiBase = process.env.PUBLIC_API_BASE || `${req.protocol}://${req.get('host')}`;
    const csv = buildAlibabaCsv(products, publicApiBase);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="alibaba-products-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
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
