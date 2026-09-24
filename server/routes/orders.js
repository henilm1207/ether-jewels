const express = require('express');
const Order = require('../models/Order');
const { validateContactAddress, quoteCart, consumeCoupon, releaseCoupon } = require('../lib/quote');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const ORDER_TTL_MS = 24 * 60 * 60 * 1000; // unpaid orders auto-cancel after 24h
const escapeRegExp = (s) => String(s).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// True once a real gateway is keyed — manual pending orders then stop
// (staff phone orders go through the admin account instead).
const gatewaysLive = () => !!process.env.RAZORPAY_KEY_ID || require('./payments/skydo').availableCurrencies().length > 0;
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['making', 'cancelled'],
  making: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Create order — login required (no guest checkout). Validates ring sizes + USD-only.
router.post('/', authRequired, async (req, res, next) => {
  try {
    const { items, couponCode, shippingAddress, orderNote, contact, payment } = req.body;
    const { addr, email } = validateContactAddress(shippingAddress, contact);
    // High-value: every order needs a freshly OTP-verified email+phone pair.
    const { requireVerifiedCheckout } = require('./verify');
    const orderPhone = (addr.phone && String(addr.phone)) || (contact && contact.phone) || '';
    if (!String(orderPhone).trim()) return res.status(400).json({ message: 'Contact phone required' });
    requireVerifiedCheckout(req, email, orderPhone);

    const method = payment && payment.method ? String(payment.method) : 'card';
    // High-value: no cash-on-delivery for new orders (history rows keep it).
    if (method !== 'card')
      return res.status(400).json({ message: 'Online payment required' });
    // Once a gateway is live, manual pending orders stop — staff use admin.
    if (gatewaysLive() && (!req.user || req.user.role !== 'admin'))
      return res.status(403).json({ message: 'Online payment required' });

    const { orderItems, subtotal, discount, coupon, shipping, total } = await quoteCart(items, couponCode);

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      pricing: { subtotal, discount, shipping, tax: 0, total, currency: 'USD' },
      couponCode: coupon ? coupon.code : null,
      shippingAddress: { ...addr },
      orderNote: typeof orderNote === 'string' ? orderNote.slice(0, 1000) : '',
      contact: {
        name: contact && contact.name ? String(contact.name).slice(0, 100) : undefined,
        email,
        phone: contact && contact.phone ? String(contact.phone).slice(0, 30) : undefined,
      },
      payment: { method, status: 'pending' },
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
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

// GET /api/orders/mine/:id — one of the caller's own orders (account detail page).
router.get('/mine/:id', authRequired, async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Order not found' });
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (e) {
    next(e);
  }
});

// GET /api/orders?status=&paymentStatus=&email=&dateFrom=&dateTo=&page=&limit=
router.get('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { status, paymentStatus, email, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    const allowed = ['pending', 'confirmed', 'making', 'shipped', 'delivered', 'cancelled'];
    const allowedPayment = ['pending', 'paid', 'failed', 'refunded'];
    const filter = {};
    if (status) {
      if (!allowed.includes(String(status))) return res.status(400).json({ message: 'Invalid status' });
      filter.status = status;
    }
    if (paymentStatus) {
      if (!allowedPayment.includes(String(paymentStatus))) return res.status(400).json({ message: 'Invalid payment status' });
      filter['payment.status'] = paymentStatus;
    }
    // contact.email is always set (guest or logged-in, see POST / above),
    // so it's the one reliable field to search a customer's orders by.
    if (email) filter['contact.email'] = new RegExp(escapeRegExp(String(email).trim().slice(0, 100)), 'i');
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      if ((dateFrom && Number.isNaN(from?.getTime())) || (dateTo && Number.isNaN(to?.getTime())))
        return res.status(400).json({ message: 'Invalid date range' });
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    const pg = Number.isFinite(Number(page)) ? Math.max(1, parseInt(page, 10)) : 1;
    const lim = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

// Revenue/AOV for the Dashboard — paid orders only (pending/failed carry no
// realized revenue).
router.get('/admin/stats', authRequired, requireAdmin, async (_req, res, next) => {
  try {
    const [agg] = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$pricing.total' }, paidCount: { $sum: 1 } } },
    ]);
    const revenue = agg?.revenue || 0;
    const paidCount = agg?.paidCount || 0;
    const byStatusAgg = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const byStatus = {};
    for (const row of byStatusAgg) byStatus[row._id] = row.count;
    res.json({ revenue, paidCount, aov: paidCount ? revenue / paidCount : 0, byStatus });
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
    // High-value rule: advance payment required — an unpaid order can be
    // cancelled but never confirmed (no backdoor, incl. manual orders).
    if (order.status === 'pending' && nextStatus === 'confirmed' && order.payment.status !== 'paid')
      return res.status(400).json({ message: 'Advance payment required before confirmation' });
    order.status = nextStatus;
    // Cancelling frees any consumed coupon back to the pool.
    if (nextStatus === 'cancelled') await releaseCoupon(order);
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
