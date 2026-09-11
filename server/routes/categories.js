const express = require('express');
const Category = require('../models/Category');

const router = express.Router();

// List active categories (for nav / collection pages). Includes aggregates + shape maps.
router.get('/', async (_req, res) => {
  try {
    const cats = await Category.find({ active: true }).sort({ sortOrder: 1 });
    res.json(cats);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:key', async (req, res) => {
  try {
    let cat = await Category.findOne({ key: req.params.key });
    if (cat && cat.aliasOf) cat = await Category.findOne({ key: cat.aliasOf });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
