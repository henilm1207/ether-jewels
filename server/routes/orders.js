const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { isRingCategory } = require('../config/catalog');
const { authOptional, authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Create order — guest or logged-in. Validates ring sizes + USD-only.
router.post('/', authOptional, async (req, res) => {
  try {
    const { items, couponCode, shippingAddress, orderNote, contact, payment } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'items[] required' });

    let subtotal = 0;
    const orderItems = [];

    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product || product.status !== 'active')
        return res.status(400).json({ message: `Product ${it.product} unavailable` });

      const qty = Math.max(1, parseInt(it.qty || 1, 10));
      const karat = it.karat === '18KT' ? '18KT' : '14KT';
      const variant =
        product.variants.find((v) => (v.material || v.name) === it.metalColor) ||
        product.variants[0];
      const base = variant ? variant.price : product.price;
      const unitPrice = base + (karat === '18KT' ? product.kt18Delta || 0 : 0);

      // Ring-size rule
      if (isRingCategory(product.category) && !it.size) {
        return res
          .status(400)
          .json({ message: `Ring size required for ${product.name}` });
      }

      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      orderItems.push({
        product: product._id,
        sku: product.styleCode || null,
        name: product.name,
        image: product.images[0],
        category: product.category,
        metal: { karat, color: variant ? variant.material || variant.name : null },
        size: it.size || null,
        qty,
        unitPrice,
        lineTotal,
      });
    }

    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!coupon) return res.status(400).json({ message: 'Invalid coupon' });
      const check = coupon.isUsable(subtotal);
      if (!check.ok) return res.status(400).json({ message: check.reason });
      discount = coupon.calcDiscount(subtotal);
      coupon.usedCount += 1;
      await coupon.save();
    }

    const shipping = subtotal >= 1000 ? 0 : 0; // free worldwide over $1000 (matches PDP)
    const total = Math.max(0, subtotal - discount + shipping);

    const order = await Order.create({
      user: req.user ? req.user._id : null,
      items: orderItems,
      pricing: { subtotal, discount, shipping, tax: 0, total, currency: 'USD' },
      couponCode: coupon ? coupon.code : null,
      shippingAddress,
      orderNote,
      contact,
      payment: { method: payment?.method || 'card', status: 'pending' },
    });
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/mine', authRequired, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

router.get('/', authRequired, requireAdmin, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(orders);
});

router.patch('/:id/status', authRequired, requireAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

module.exports = router;
