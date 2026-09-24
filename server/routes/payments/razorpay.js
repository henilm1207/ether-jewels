// Razorpay Standard Checkout (India) — INR only. Flow: client sends the
// cart → we re-price server-side (lib/quote, same totals as every other
// checkout path) → create a pending DB order → convert the USD total to INR
// (admin-editable PricingSettings.usdInrRate) → create a Razorpay order →
// browser opens Checkout.js against that order_id → we verify the signature
// AND re-fetch the payment from Razorpay before ever marking an order paid.
// EMI is hidden in the Checkout config (client) — never trust the client
// alone, so also confirmed here: no EMI-specific fields are accepted.
const express = require('express');
const crypto = require('crypto');
const Order = require('../../models/Order');
const PricingSettings = require('../../models/PricingSettings');
const { validateContactAddress, quoteCart, buildPendingOrderDoc, onPaymentSuccess, onPaymentFailed, orderView } = require('../../lib/quote');
const { saveAddressForUser } = require('../../lib/address');
const { authOptional, authRequired } = require('../../middleware/auth');

const router = express.Router();
const ORDER_TTL_MS = 24 * 60 * 60 * 1000; // unpaid orders auto-cancel after 24h

function razorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// USD total -> INR paise, using the same admin-editable rate the pricing
// engine uses (server/models/PricingSettings.js) — no separate FX config.
async function usdToInrPaise(totalUsd) {
  const settings = await PricingSettings.findById('global');
  const rate = (settings && settings.usdInrRate) || 96;
  return { paise: Math.round(totalUsd * rate * 100), rate };
}

function verifySignature(orderId, paymentId, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST /api/payments/razorpay/create-order — cart + contact -> {razorpayOrderId, orderId, amountInr, exchangeRate, totalUsd}
// Idempotent: same idempotencyKey reuses the pending order. Coupon consumed
// only when the payment is verified as captured.
router.post('/create-order', authRequired, async (req, res, next) => {
  try {
    const rzp = razorpayClient();
    if (!rzp) return res.status(503).json({ message: 'Razorpay not configured yet' });
    const { items, couponCode, shippingAddress, contact, idempotencyKey } = req.body || {};
    const { addr, email } = validateContactAddress(shippingAddress, contact);
    const { requireVerifiedCheckout } = require('../verify');
    const orderPhone = (addr.phone && String(addr.phone)) || (contact && contact.phone) || '';
    if (!String(orderPhone).trim()) return res.status(400).json({ message: 'Contact phone required' });
    requireVerifiedCheckout(req, email, orderPhone);
    const key = typeof idempotencyKey === 'string' ? idempotencyKey.trim().slice(0, 100) : '';
    const ownerFilter = { user: req.user._id };
    let order = null;
    if (key) {
      order = await Order.findOne({ idempotencyKey: key, status: 'pending', 'payment.status': { $ne: 'paid' }, ...ownerFilter });
    }
    if (!order) {
      const q = await quoteCart(items, couponCode);
      order = await Order.create({
        ...buildPendingOrderDoc({ userId: req.user._id, orderItems: q.orderItems, subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, total: q.total, coupon: q.coupon, addr, email, body: req.body, method: 'razorpay' }),
        idempotencyKey: key || null,
        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
      });
      if (req.body.saveAddress === true) await saveAddressForUser(req.user._id, addr);
    }
    const totalUsd = order.pricing.total;
    if (!(totalUsd > 0)) return res.status(400).json({ message: 'Order total must be above zero' });
    const { paise, rate } = await usdToInrPaise(totalUsd);
    if (!(paise > 0)) return res.status(400).json({ message: 'Converted amount must be above zero' });
    const rzpOrder = await rzp.orders.create({
      amount: paise,
      currency: 'INR',
      receipt: order._id.toString(),
      notes: { orderId: order._id.toString() },
    });
    order.payment.txnId = rzpOrder.id;
    order.payment.chargedAmount = paise / 100;
    order.payment.chargedCurrency = 'INR';
    await order.save();
    res.status(201).json({ razorpayOrderId: rzpOrder.id, orderId: order._id, amountInr: paise / 100, exchangeRate: rate, totalUsd });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

// POST /api/payments/razorpay/verify — {orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature}
// Deterministic confirm: verify the HMAC signature, then re-fetch the
// payment from Razorpay itself and confirm captured + amount/currency match
// OUR recorded charge — never trust the client's word alone.
router.post('/verify', authOptional, async (req, res, next) => {
  try {
    const rzp = razorpayClient();
    if (!rzp) return res.status(503).json({ message: 'Razorpay not configured yet' });
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
      return res.status(400).json({ message: 'Missing verification fields' });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (String(order.payment.txnId) !== String(razorpayOrderId))
      return res.status(400).json({ message: 'Payment does not match this order' });
    if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, process.env.RAZORPAY_KEY_SECRET)) {
      await onPaymentFailed(order, razorpayPaymentId);
      return res.status(400).json({ message: 'Signature verification failed' });
    }
    const payment = await rzp.payments.fetch(razorpayPaymentId);
    const expectedPaise = Math.round(Number(order.payment.chargedAmount) * 100);
    if (!payment || payment.status !== 'captured' || payment.amount !== expectedPaise || String(payment.currency).toUpperCase() !== 'INR') {
      await onPaymentFailed(order, razorpayPaymentId);
      return res.status(400).json({ message: 'Payment verification mismatch' });
    }
    await onPaymentSuccess(order, razorpayPaymentId);
    const view = orderView(order, req);
    if (view.error) return res.status(view.error.status || 403).json({ message: view.error.message });
    res.json({ order: view.order });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

// Webhook handler — raw body (see server.js), signature-verified against
// RAZORPAY_WEBHOOK_SECRET. Backstops /verify if the browser never calls back.
async function webhookHandler(req, res, next) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ message: 'Razorpay not configured yet' });
    const sig = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(sig || ''));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
      return res.status(400).json({ message: 'Invalid webhook signature' });
    const event = JSON.parse(req.body.toString('utf8'));
    const type = event.event;
    if (type === 'payment.captured' || type === 'payment.failed') {
      const payment = event.payload && event.payload.payment && event.payload.payment.entity;
      const orderId = payment && payment.notes && payment.notes.orderId;
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          if (type === 'payment.captured') {
            const expectedPaise = Math.round(Number(order.payment.chargedAmount) * 100);
            const amtOk = payment.amount === expectedPaise;
            const curOk = String(payment.currency || '').toUpperCase() === 'INR';
            if (amtOk && curOk) await onPaymentSuccess(order, payment.id);
            else await onPaymentFailed(order, payment.id);
          } else {
            await onPaymentFailed(order, payment.id);
          }
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    next(e);
  }
}

module.exports = router;
module.exports.webhookHandler = webhookHandler;
