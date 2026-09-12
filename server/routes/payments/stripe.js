// Stripe card payments (test mode first) — USD, guest or logged-in.
// Flow: client sends the cart → we re-price server-side (lib/quote, the
// same totals as POST /api/orders), create a pending DB order, then a
// PaymentIntent. The browser confirms the card; the webhook below flips
// the order to paid/confirmed. Never trust client-side totals.
const express = require('express');
const Order = require('../../models/Order');
const { validateContactAddress, quoteCart, onPaymentSuccess, onPaymentFailed, orderView } = require('../../lib/quote');
const { authOptional } = require('../../middleware/auth');

const router = express.Router();
const ORDER_TTL_MS = 24 * 60 * 60 * 1000; // unpaid orders auto-cancel after 24h

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

function buildOrderDoc({ userId, orderItems, subtotal, discount, shipping, total, coupon, addr, email, body, method }) {
  return {
    user: userId || null,
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
    orderNote: typeof body.orderNote === 'string' ? body.orderNote.slice(0, 1000) : '',
    contact: {
      name: body.contact && body.contact.name ? String(body.contact.name).slice(0, 100) : undefined,
      email,
      phone: body.contact && body.contact.phone ? String(body.contact.phone).slice(0, 30) : undefined,
    },
    payment: { method, status: 'pending' },
  };
}

// POST /api/payments/stripe/create-intent — cart + contact → {clientSecret, orderId, total}
// Idempotent: same idempotencyKey reuses the pending order (never mints
// duplicates on double-click/replay). Coupon consumed only when PAID.
router.post('/create-intent', authOptional, async (req, res, next) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return res.status(503).json({ message: 'Card payments not configured yet' });
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
    let coupon = null;
    let subtotal = 0;
    let shipping = 0;
    if (!order) {
      const q = await quoteCart(items, couponCode);
      coupon = q.coupon;
      subtotal = q.subtotal;
      shipping = q.shipping;
      order = await Order.create({
        ...buildOrderDoc({ userId: req.user && req.user._id, orderItems: q.orderItems, subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, total: q.total, coupon, addr, email, body: req.body, method: 'stripe' }),
        idempotencyKey: key || null,
        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
      });
    }
    const total = order.pricing.total;
    if (!(total > 0)) return res.status(400).json({ message: 'Order total must be above zero' });
    const intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(total * 100),
        currency: 'usd',
        automatic_payment_methods: { enabled: true, allow_redirects: 'always' },
        receipt_email: email,
        metadata: { orderId: order._id.toString() },
      },
      { idempotencyKey: `ether-${order._id}` }
    );
    order.payment.txnId = intent.id;
    await order.save();
    res.status(201).json({ clientSecret: intent.client_secret, orderId: order._id, total });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

// POST /api/payments/stripe/confirm — {orderId, paymentIntentId}.
// Deterministic fallback so the browser doesn't depend on webhook timing:
// re-reads the intent from Stripe and marks paid only on real success.
// Binding check (intent.metadata.orderId === orderId) keeps guests safe.
router.post('/confirm', authOptional, async (req, res, next) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return res.status(503).json({ message: 'Card payments not configured yet' });
    const { orderId, paymentIntentId } = req.body || {};
    if (!orderId || !paymentIntentId) return res.status(400).json({ message: 'orderId, paymentIntentId required' });
    const intent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
    if (!intent || !intent.metadata || String(intent.metadata.orderId) !== String(orderId))
      return res.status(400).json({ message: 'Payment does not match this order' });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (intent.status === 'succeeded') {
      // Amount/currency must match OUR total — never confirm the wrong charge.
      if (intent.amount !== Math.round(Number(order.pricing.total) * 100) || String(intent.currency).toLowerCase() !== 'usd') {
        await onPaymentFailed(order, intent.id);
        return res.status(400).json({ message: 'Charged amount mismatch' });
      }
      await onPaymentSuccess(order, intent.id);
    } else if (intent.status === 'requires_payment_method' || intent.status === 'canceled') {
      await onPaymentFailed(order, intent.id);
    }
    const view = orderView(order, req);
    if (view.error) return res.status(view.error.status || 403).json({ message: view.error.message });
    res.json({ order: view.order, paymentStatus: intent.status });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});
// Webhook handler — raw body (see server.js), signature-verified.
async function webhookHandler(req, res, next) {
  try {
    const stripe = stripeClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) return res.status(503).json({ message: 'Card payments not configured yet' });
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }
    const type = event.type;
    if (type === 'payment_intent.succeeded' || type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const orderId = intent && intent.metadata && intent.metadata.orderId;
      if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        if (type === 'payment_intent.succeeded') {
          const amtOk = intent.amount === Math.round(Number(order.pricing.total) * 100);
          const curOk = String(intent.currency || '').toLowerCase() === 'usd';
          if (amtOk && curOk) await onPaymentSuccess(order, intent.id);
          else await onPaymentFailed(order, intent.id);
        } else {
          await onPaymentFailed(order, intent.id);
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
module.exports.buildOrderDoc = buildOrderDoc;
