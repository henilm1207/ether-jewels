const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const ALLOWED_STATUSES = ['active', 'draft', 'archived'];
const PRODUCT_FIELDS = [
  'name', 'slug', 'legacySlugs', 'styleCode', 'shape', 'price', 'kt18Delta',
  'compareAtPrice', 'description', 'shortDescription', 'category', 'images',
  'video', 'variants', 'tags', 'badge', 'status', 'inStock', 'stockQty',
  'featured', 'sizes', 'defaultSize', 'details', 'seoTitle', 'seoDesc',
];
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};
const escapeRegExp = (s) => String(s).slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

// GET /api/products?category=&shape=&metal=&minPrice=&maxPrice=&search=&featured=&sort=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      shape,
      metal,
      minPrice,
      maxPrice,
      search,
      featured,
      sort,
      status,
      page = '1',
      limit = '50',
    } = req.query;

    // Public list is active-only; other statuses need admin
    const isAdmin = req.headers.authorization; // cheap hint; real check in admin routes
    void isAdmin;
    const filter = { status: 'active' };
    if (status && status !== 'active') {
      return res.status(403).json({ message: 'Use admin product list for non-active status' });
    }

    if (category) {
      const cat = await resolveCategory(category);
      if (cat?.aggregateKeys?.length) {
        filter.category = { $in: cat.aggregateKeys };
      } else if (cat?.shape) {
        filter.shape = cat.shape;
      } else if (cat) {
        filter.category = cat.key;
      } else {
        filter.category = String(category);
      }
    }
    if (shape) filter.shape = String(shape);
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
      filter.$or = [
        { 'variants.material': new RegExp(safe, 'i') },
        { 'variants.name': new RegExp(safe, 'i') },
      ];
    }
    if (search) filter.$text = { $search: String(search).slice(0, 100) };

    const pgRaw = parseInt(page, 10);
    const limRaw = parseInt(limit, 10);
    const pg = Number.isFinite(pgRaw) ? Math.max(1, pgRaw) : 1;
    const lim = Number.isFinite(limRaw) ? Math.min(100, Math.max(1, limRaw)) : 50;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(buildSort(sort))
        .skip((pg - 1) * lim)
        .limit(lim),
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
    const product = await Product.create(body);
    res.status(201).json(product);
  } catch (e) {
    e.status = 400;
    next(e);
  }
});

router.put('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const body = pick(req.body, PRODUCT_FIELDS);
    body.currency = 'USD';
    delete body.ratingAvg;
    delete body.ratingCount;
    const product = await Product.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (e) {
    e.status = 400;
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

module.exports = router;
