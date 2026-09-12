// PayPal payments (sandbox first) — USD, guest or logged-in. No SDK dep:
// direct REST via Node fetch. Same server-side pricing as every other path.
// Flow: create → PayPal order id → browser approves → capture → we verify
// COMPLETED + exact amount match before marking paid/confirmed.
const express = require('express');
const Order = require('../../models/Order');
const { validateContactAddress, quoteCart, onPaymentSuccess, onPaymentFailed, orderView } = require('../../lib/quote');
const { authOptional } = require('../../middleware/auth');
const { buildOrderDoc } = require('./stripe');

const router = express.Router();
const ORDER_TTL_MS = 24 * 60 * 60 * 1000; // unpaid orders auto-cancel after 24h

const paypalBase = () =>
  (process.env.PAYPAL_MODE || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

function configured() {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

let cachedToken = null; // { token, exp } — in-memory, per process

async function paypalToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.exp > now + 60000) return cachedToken.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw Object.assign(new Error('PayPal auth failed'), { status: 502 });
  const data = await res.json();
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 300) * 1000 };
  return cachedToken.token;
}

async function paypalFetch(path, { method = 'GET', body, token, requestId } = {}) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (requestId) headers['PayPal-Request-Id'] = requestId;
  const res = await fetch(`${paypalBase()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || (data.details && data.details[0] && data.details[0].description))) || 'PayPal request failed';
    throw Object.assign(new Error(String(msg).slice(0, 200)), { status: 502 });
  }
  return data;
}

// POST /api/payments/paypal/create-order — cart + contact → {paypalOrderId, orderId, total}
// Idempotent: same idempotencyKey reuses the pending order. Coupon consumed
// only when the capture succeeds.
router.post('/create-order', authOptional, async (req, res, next) => {
  try {
    if (!configured()) return res.status(503).json({ message: 'PayPal not configured yet' });
    const { items, couponCode, shippingAddress, contact, idempotencyKey } = req.body || {};
    const { addr, email } = validateContactAddress(shippingAddress, contact);
    const { requireVerifiedCheckout } = require('../verify');
    const orderPhone = (addr.phone && String(addr.phone)) || (contact && contact.phone) || '';
    if (!String(orderPhone).trim()) return res.status(400).json({ message: 'Contact phone required' });
    requireVerifiedCheckout(req, email, orderPhone);
    const key = typeof idempotencyKey === 'string' ? idempotencyKey.trim().slice(0, 100) : '';
    const ownerFilter = req.user ? { user: req.user._id } : { user: null, 'contact.email': email };
    let order = null;
    if (key) {
      order = await Order.findOne({ idempotencyKey: key, status: 'pending', 'payment.status': { $ne: 'paid' }, ...ownerFilter });
    }
    if (!order) {
      const q = await quoteCart(items, couponCode);
      order = await Order.create({
        ...buildOrderDoc({ userId: req.user && req.user._id, orderItems: q.orderItems, subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, total: q.total, coupon: q.coupon, addr, email, body: req.body, method: 'paypal' }),
        idempotencyKey: key || null,
        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
      });
    }
    const total = order.pricing.total;
    if (!(total > 0)) return res.status(400).json({ message: 'Order total must be above zero' });
    const token = await paypalToken();
    const pp = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      token,
      requestId: `ether-${order._id}`,
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order._id.toString(),
            custom_id: order._id.toString(),
            description: 'EtherStar Jewels order',
            amount: { currency_code: 'USD', value: total.toFixed(2) },
          },
        ],
      },
    });
    order.payment.txnId = pp.id;
    await order.save();
    res.status(201).json({ paypalOrderId: pp.id, orderId: order._id, total });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

// POST /api/payments/paypal/capture — {paypalOrderId} → capture + verify → order
router.post('/capture', authOptional, async (req, res, next) => {
  try {
    if (!configured()) return res.status(503).json({ message: 'PayPal not configured yet' });
    const paypalOrderId = req.body && String(req.body.paypalOrderId || '');
    if (!paypalOrderId) return res.status(400).json({ message: 'paypalOrderId required' });
    const order = await Order.findOne({ 'payment.txnId': paypalOrderId, 'payment.method': 'paypal' });
    if (!order) return res.status(404).json({ message: 'Order not found for this payment' });
    if (order.payment.status === 'paid') {
      const view = orderView(order, req);
      if (view.error) return res.status(view.error.status || 403).json({ message: view.error.message });
      return res.json({ order: view.order });
    }
    const token = await paypalToken();
    const cap = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      token,
      requestId: `ether-cap-${order._id}`,
      body: {},
    });
    if (cap.status !== 'COMPLETED') {
      await onPaymentFailed(order, paypalOrderId);
      return res.status(400).json({ message: 'PayPal payment not completed' });
    }
    // Anti-tamper: captured amount must equal our order total exactly.
    const captures = ((cap.purchase_units || [])[0] && (cap.purchase_units[0].payments || {}).captures) || [];
    const paidValue = captures.reduce((s, c) => s + Number((c.amount || {}).value || 0), 0);
    if (Math.abs(paidValue - Number(order.pricing.total)) > 0.005) {
      await onPaymentFailed(order, paypalOrderId);
      return res.status(400).json({ message: 'Captured amount mismatch' });
    }
    const captureId = (captures[0] && captures[0].id) || paypalOrderId;
    await onPaymentSuccess(order, captureId);
    const view = orderView(order, req);
    if (view.error) return res.status(view.error.status || 403).json({ message: view.error.message });
    res.json({ order: view.order });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

module.exports = router;
