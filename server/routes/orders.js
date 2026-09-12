const express = require('express');
const Order = require('../models/Order');
const { validateContactAddress, quoteCart, consumeCoupon } = require('../lib/quote');
const { authOptional, authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
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
    const { addr, email } = validateContactAddress(shippingAddress, contact);

    const method = payment && payment.method ? String(payment.method) : 'card';
    if (!['card', 'cod'].includes(method))
      return res.status(400).json({ message: 'Invalid payment method' });

    const { orderItems, subtotal, discount, coupon, shipping, total } = await quoteCart(items, couponCode);

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
      await consumeCoupon(order, coupon, subtotal, shipping);
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

router.patch('/:id/status', authRequired, requireAdmin, async (req, res, next) => {  try {
    const nextStatus = req.body && req.body.status;
    if (!ALLOWED_TRANSITIONS[nextStatus] && !Object.keys(ALLOWED_TRANSITIONS).includes(nextStatus))
      return res.status(400).json({ message: 'Invalid status' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus))
      return res.status(400).json({ message: `Cannot move ${order.status} -> ${nextStatus}` });
    // High-value rule: advance payment required — an unpaid order can be
    // cancelled but never confirmed (no backdoor, incl. manual orders).
    if (order.status === 'pending' && nextStatus === 'confirmed' && order.payment.status !== 'paid')
      return res.status(400).json({ message: 'Advance payment required before confirmation' });
    order.status = nextStatus;
    await order.save();
    res.json(order);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/orders/:id/tracking — admin sets the shipment tracking id/carrier.
// Visible to the customer on /account once shipped.
router.patch('/:id/tracking', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (['delivered', 'cancelled'].includes(order.status))
      return res.status(400).json({ message: 'Tracking cannot change after delivery/cancellation' });
    const { trackingId, carrier } = req.body || {};
    order.trackingId =
      trackingId == null || String(trackingId).trim() === '' ? null : String(trackingId).trim().slice(0, 100);
    order.carrier =
      carrier == null || String(carrier).trim() === '' ? null : String(carrier).trim().slice(0, 100);
    await order.save();
    res.json(order);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
