const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { isRingCategory } = require('../config/catalog');
const { authOptional, authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const round2 = (n) => Math.round(n * 100) / 100;
const MAX_ITEMS = 20;
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['making', 'cancelled'],
  making: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Create order — guest or logged-in. Validates ring sizes + USD-only.
router.post('/', authOptional, async (req, res, next) => {
  try {
    const { items, couponCode, shippingAddress, orderNote, contact, payment } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS)
      return res.status(400).json({ message: `items[] must contain 1-${MAX_ITEMS} entries` });

    const addr = shippingAddress || {};
    for (const f of ['fullName', 'line1', 'city', 'country', 'zip']) {
      if (!addr[f] || typeof addr[f] !== 'string' || !addr[f].trim())
        return res.status(400).json({ message: `shippingAddress.${f} required` });
    }
    const email = (contact && contact.email ? String(contact.email) : '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'contact.email invalid' });

    const method = payment && payment.method ? String(payment.method) : 'card';
    if (!['card', 'cod'].includes(method))
      return res.status(400).json({ message: 'Invalid payment method' });

    let subtotal = 0;
    const orderItems = [];

    // Batch-fetch products to avoid N+1
    const ids = items.map((it) => it && it.product).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const found = await Product.find({ _id: { $in: ids }, status: 'active' });
    const byId = new Map(found.map((p) => [p._id.toString(), p]));

    for (const it of items) {
      const idStr = it && it.product ? String(it.product) : '';
      const product = byId.get(idStr);
      if (!product)
        return res.status(400).json({ message: `Product ${idStr || '?'} unavailable` });
      if (product.inStock === false)
        return res.status(400).json({ message: `${product.name} is out of stock` });

      const qty = Number(it.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 10)
        return res.status(400).json({ message: `Invalid qty for ${product.name} (1-10)` });

      const karat = it.karat;
      if (karat !== undefined && karat !== '14KT' && karat !== '18KT')
        return res.status(400).json({ message: `Invalid karat for ${product.name}` });
      const useKarat = karat || '14KT';

      let variant = null;
      if (it.metalColor != null) {
        const wanted = String(it.metalColor).trim();
        variant = product.variants.find((v) => (v.material || v.name) === wanted);
        if (!variant)
          return res.status(400).json({ message: `Invalid metalColor for ${product.name}` });
      } else {
        variant = product.variants[0];
      }
      if (!variant) return res.status(400).json({ message: `${product.name} has no variants` });

      const base = variant.price;
      const unitPrice = round2(base + (useKarat === '18KT' ? product.kt18Delta || 0 : 0));

      // Ring-size rule: membership check both ways
      const ring = isRingCategory(product.category);
      if (ring) {
        if (!it.size || !product.sizes.includes(String(it.size)))
          return res.status(400).json({ message: `Valid ring size required for ${product.name}` });
      } else if (it.size) {
        return res.status(400).json({ message: `Size not applicable for ${product.name}` });
      }

      const lineTotal = round2(unitPrice * qty);
      subtotal = round2(subtotal + lineTotal);
      orderItems.push({
        product: product._id,
        sku: product.styleCode || null,
        name: product.name,
        image: product.images[0],
        category: product.category,
        metal: { karat: useKarat, color: variant.material || variant.name || null },
        size: it.size ? String(it.size) : null,
        qty,
        unitPrice,
        lineTotal,
      });
    }

    let discount = 0;
    let coupon = null;
    if (couponCode != null && String(couponCode).trim() !== '') {
      const code = String(couponCode).trim().toUpperCase();
      coupon = await Coupon.findOne({ code });
      if (!coupon) return res.status(400).json({ message: 'Invalid coupon' });
      const check = coupon.isUsable(subtotal);
      if (!check.ok) return res.status(400).json({ message: check.reason });
      discount = coupon.calcDiscount(subtotal);
    }

    const shipping = 0; // free worldwide over $1000 (matches PDP)
    const total = round2(Math.max(0, subtotal - discount + shipping));

    const order = await Order.create({
      user: req.user ? req.user._id : null,
      items: orderItems,
      pricing: { subtotal, discount, shipping, tax: 0, total, currency: 'USD' },
      couponCode: coupon ? coupon.code : null,
      shippingAddress: {
        fullName: String(addr.fullName).trim(),
        line1: String(addr.line1).trim(),
        city: String(addr.city).trim(),
        country: String(addr.country).trim(),
        zip: String(addr.zip).trim(),
        phone: addr.phone ? String(addr.phone).slice(0, 30) : undefined,
      },
      orderNote: typeof orderNote === 'string' ? orderNote.slice(0, 1000) : '',
      contact: {
        name: contact && contact.name ? String(contact.name).slice(0, 100) : undefined,
        email,
        phone: contact && contact.phone ? String(contact.phone).slice(0, 30) : undefined,
      },
      payment: { method, status: 'pending' },
    });

    // Atomic coupon increment AFTER order succeeds — prevents burn + overshoot
    if (coupon) {
      const updated = await Coupon.findOneAndUpdate(
        { _id: coupon._id, $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        { $inc: { usedCount: 1 } },
        { new: true }
      );
      if (!updated && coupon.maxUses != null) {
        // limit hit concurrently — keep order but drop discount association
        order.couponCode = null;
        order.pricing.discount = 0;
        order.pricing.total = round2(subtotal + shipping);
        await order.save();
      }
    }

    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

router.get('/mine', authRequired, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

router.get('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const allowed = ['pending', 'confirmed', 'making', 'shipped', 'delivered', 'cancelled'];
    const filter = {};
    if (status) {
      if (!allowed.includes(String(status))) return res.status(400).json({ message: 'Invalid status' });
      filter.status = status;
    }
    const pg = Number.isFinite(Number(page)) ? Math.max(1, parseInt(page, 10)) : 1;
    const lim = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim);
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const nextStatus = req.body && req.body.status;
    if (!ALLOWED_TRANSITIONS[nextStatus] && !Object.keys(ALLOWED_TRANSITIONS).includes(nextStatus))
      return res.status(400).json({ message: 'Invalid status' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus))
      return res.status(400).json({ message: `Cannot move ${order.status} -> ${nextStatus}` });
    order.status = nextStatus;
    await order.save();
    res.json(order);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
