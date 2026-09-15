const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { authRequired, requireAdmin } = require('../middleware/auth');
const { LOCAL_IMG_RE } = require('../lib/localImages');

const router = express.Router();
const CATEGORY_FIELDS = [
  'key', 'name', 'parent', 'description', 'image', 'shape',
  'aggregateKeys', 'aliasOf', 'requiresSize', 'requiresLength',
  'attributes', 'sortOrder', 'active',
];
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

async function resolveCategory(key) {
  const seen = new Set();
  let cur = String(key);
  for (let i = 0; i < 5; i++) {
    if (seen.has(cur)) return null; // cycle
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

// List active categories (for nav / collection pages). Includes aggregates + shape maps.
router.get('/', async (_req, res, next) => {
  try {
    const cats = await Category.find({ active: true }).sort({ sortOrder: 1 });
    res.json(cats);
  } catch (e) {
    next(e);
  }
});

router.get('/:key', async (req, res, next) => {
  try {
    const cat = await resolveCategory(req.params.key);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (e) {
    next(e);
  }
});

// Admin: full list (including inactive)
router.get('/admin/all', authRequired, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await Category.find().sort({ sortOrder: 1 }));
  } catch (e) {
    next(e);
  }
});

const IMAGE_URL_RE = /^https?:\/\/[^\s"'<>\\^`{|}]+$/i;
// Category imagery mirrors Product media: legacy/external https URLs plus
// locally stored uploads (/uploads/YYYY-MM/<uuid>.webp). Empty = no image.
const isImageUrl = (v) =>
  typeof v === 'string' && (IMAGE_URL_RE.test(v) || LOCAL_IMG_RE.test(v));

router.post('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const body = pick(req.body, CATEGORY_FIELDS);
    if (!body.key || !body.name)
      return res.status(400).json({ message: 'key and name required' });
    if (body.image != null && body.image !== '' && !isImageUrl(String(body.image)))
      return res.status(400).json({ message: 'image must be a valid http(s) URL or /uploads/*.webp path' });
    const cat = await Category.create(body);
    res.status(201).json(cat);
  } catch (e) {
    if (e && e.code === 11000) return res.status(400).json({ message: 'Category key exists' });
    e.status = 400;
    next(e);
  }
});

router.put('/:key', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const body = pick(req.body, CATEGORY_FIELDS.filter((k) => k !== 'key'));
    if (body.image != null && body.image !== '' && !isImageUrl(String(body.image)))
      return res.status(400).json({ message: 'image must be a valid http(s) URL or /uploads/*.webp path' });
    const cat = await Category.findOneAndUpdate({ key: req.params.key }, body, {
      new: true,
      runValidators: true,
    });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (e) {
    e.status = 400;
    next(e);
  }
});

// DELETE /:key — refuses to delete a category still in use, so a product
// can never end up pointing at a category key that no longer exists.
router.delete('/:key', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const key = req.params.key;
    const usedByProduct = await Product.exists({ category: key });
    if (usedByProduct)
      return res.status(400).json({ message: 'Category is used by one or more products — reassign or remove those first' });
    const aliasedBy = await Category.exists({ aliasOf: key });
    if (aliasedBy)
      return res.status(400).json({ message: 'Another category aliases this one — update or delete that first' });
    const cat = await Category.findOneAndDelete({ key });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
