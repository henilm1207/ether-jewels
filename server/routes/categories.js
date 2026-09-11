const express = require('express');
const Category = require('../models/Category');

const router = express.Router();

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

module.exports = router;
