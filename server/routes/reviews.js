const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Review = require('../models/Review');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
// Public writes need their own budget — 10/hour/IP stops review flooding
// without touching the read path browsers hit on every PDP view.
const reviewWriteLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

// Admin: list all reviews (filter by status)
router.get('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filter = {};
    if (status) {
      if (!['pending', 'approved', 'rejected'].includes(String(status)))
        return res.status(400).json({ message: 'Invalid status' });
      filter.status = status;
    }
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    res.json(
      await Review.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim)
    );
  } catch (e) {
    next(e);
  }
});

router.get('/product/:productId', async (req, res, next) => {  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ message: 'Invalid product id' });
    const pg = Math.max(1, parseInt(req.query.page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [items, total] = await Promise.all([
      Review.find({ product: productId, status: 'approved' })
        .sort({ createdAt: -1 })
        .skip((pg - 1) * lim)
        .limit(lim),
      Review.countDocuments({ product: productId, status: 'approved' }),
    ]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

router.post('/', authRequired, reviewWriteLimiter, async (req, res, next) => {
  try {
    const { product, name, rating, title, text, location } = req.body || {};
    if (!product || !mongoose.Types.ObjectId.isValid(String(product)))
      return res.status(400).json({ message: 'Valid product id required' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5)
      return res.status(400).json({ message: 'Rating must be an integer 1-5' });
    // Reviews go public after approval — reject contact details up front.
    const blob = `${name || ''} ${title || ''} ${text || ''} ${location || ''}`;
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(blob))
      return res.status(400).json({ message: 'Please remove email addresses from your review' });
    // Login-required: the review belongs to the account, one per product.
    const displayName =
      typeof name === 'string' && name.trim()
        ? name.trim().slice(0, 100)
        : (req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Customer').slice(0, 100);
    const review = await Review.create({
      product,
      name: displayName,
      rating: r,
      title: typeof title === 'string' ? title.trim().slice(0, 200) : undefined,
      text: typeof text === 'string' ? text.slice(0, 5000) : '',
      location: typeof location === 'string' ? location.trim().slice(0, 100) : undefined,
      status: 'pending',
      verifiedPurchase: false,
      user: req.user._id,
    });
    res.status(201).json(review);
  } catch (e) {
    // One review per account per product (unique product+user index).
    if (e && e.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }
    e.status = 400;
    next(e);
  }
});

router.patch('/:id/approve', authRequired, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid review id' });
    const status = (req.body && req.body.status) || 'approved';
    if (!['approved', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await Review.recalcProduct(review.product);
    res.json(review);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
