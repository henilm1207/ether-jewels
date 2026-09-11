const express = require('express');
const Review = require('../models/Review');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/product/:productId', async (req, res) => {
  const reviews = await Review.find({
    product: req.params.productId,
    status: 'approved',
  }).sort({ createdAt: -1 });
  res.json(reviews);
});

router.post('/', async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json(review);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.patch('/:id/approve', authRequired, requireAdmin, async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status || 'approved' },
    { new: true }
  );
  if (!review) return res.status(404).json({ message: 'Review not found' });
  await Review.recalcProduct(review.product);
  res.json(review);
});

module.exports = router;
