const express = require('express');
const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = ['contact', 'custom-design', 'diamond-help'];

router.post('/', async (req, res, next) => {
  try {
    const { type = 'contact', name, email, phone, product, message } = req.body || {};
    if (!TYPES.includes(type)) return res.status(400).json({ message: 'Invalid type' });
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ message: 'Invalid email' });
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 5000)
      return res.status(400).json({ message: 'Message must be 10-5000 chars' });
    let productId = null;
    if (product) {
      if (!mongoose.Types.ObjectId.isValid(String(product)))
        return res.status(400).json({ message: 'Invalid product id' });
      const exists = await Product.exists({ _id: product });
      if (!exists) return res.status(400).json({ message: 'Product not found' });
      productId = product;
    }
    const inquiry = await Inquiry.create({
      type,
      name: typeof name === 'string' ? name.trim().slice(0, 100) : undefined,
      email: cleanEmail,
      phone: typeof phone === 'string' ? phone.trim().slice(0, 30) : undefined,
      product: productId,
      message: message.trim(),
      status: 'new',
    });
    res.status(201).json({ message: 'Message received', inquiry });
  } catch (e) {
    e.status = 400;
    next(e);
  }
});

router.get('/', authRequired, requireAdmin, async (req, res, next) => {  try {
    const { status, type, page = '1', limit = '20' } = req.query;
    const filter = {};
    if (status) {
      if (!['new', 'replied', 'closed'].includes(String(status)))
        return res.status(400).json({ message: 'Invalid status' });
      filter.status = status;
    }
    if (type) {
      if (!TYPES.includes(String(type))) return res.status(400).json({ message: 'Invalid type' });
      filter.type = type;
    }
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    res.json(await Inquiry.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim));
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid inquiry id' });
    const { status } = req.body || {};
    if (!['new', 'replied', 'closed'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });
    res.json(inquiry);
  } catch (e) {
    next(e);
  }
});

// DELETE /:id — permanent removal (spam/handled), admin only.
router.delete('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid inquiry id' });
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });
    res.json({ message: 'Inquiry deleted' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
