const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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
      return { createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

// GET /api/products?category=&shape=&metal=&minPrice=&maxPrice=&search=&featured=&sort=&page=&limit=
router.get('/', async (req, res) => {
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
      status = 'active',
      page = '1',
      limit = '50',
    } = req.query;

    const filter = { status };

    if (category) {
      const cat = await Category.findOne({ key: category });
      if (cat && cat.aliasOf) {
        // resolve alias
        const canonical = await Category.findOne({ key: cat.aliasOf });
        if (canonical?.aggregateKeys?.length) filter.category = { $in: canonical.aggregateKeys };
        else if (canonical?.shape) filter.shape = canonical.shape;
        else filter.category = cat.aliasOf;
      } else if (cat?.aggregateKeys?.length) {
        filter.category = { $in: cat.aggregateKeys };
      } else if (cat?.shape) {
        filter.shape = cat.shape;
      } else {
        filter.category = category;
      }
    }
    if (shape) filter.shape = shape;
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (metal) {
      filter.$or = [
        { 'variants.material': new RegExp(metal.split(' ')[0], 'i') },
        { 'variants.name': new RegExp(metal.split(' ')[0], 'i') },
      ];
    }
    if (search) filter.$text = { $search: search };

    const pg = Math.max(1, parseInt(page, 10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(buildSort(sort))
        .skip((pg - 1) * lim)
        .limit(lim),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Back-compat: old clients expect a bare array. Keep slug route below.
router.get('/:slug', async (req, res) => {
  try {
    const product =
      (await Product.findOne({ slug: req.params.slug, status: 'active' })) ||
      (await Product.findOne({ legacySlugs: req.params.slug, status: 'active' }));
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin CRUD
router.post('/', authRequired, requireAdmin, async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, currency: 'USD' });
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.put('/:id', authRequired, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.delete('/:id', authRequired, requireAdmin, async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { status: 'archived' },
    { new: true }
  );
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Archived', product });
});

module.exports = router;
