// Stripe card payments (test mode first) — USD, guest or logged-in.
// Flow: client sends the cart → we re-price server-side (lib/quote, the
// same totals as POST /api/orders), create a pending DB order, then a
// PaymentIntent. The browser confirms the card; the webhook below flips
// the order to paid/confirmed. Never trust client-side totals.
const express = require('express');
const Order = require('../../models/Order');
const { validateContactAddress, quoteCart, consumeCoupon } = require('../../lib/quote');
const { authOptional } = require('../../middleware/auth');

const router = express.Router();

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
router.post('/create-intent', authOptional, async (req, res, next) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return res.status(503).json({ message: 'Card payments not configured yet' });
    const { items, couponCode, shippingAddress, contact } = req.body || {};
    const { addr, email } = validateContactAddress(shippingAddress, contact);
    const { orderItems, subtotal, discount, coupon, shipping, total } = await quoteCart(items, couponCode);
    if (!(total > 0)) return res.status(400).json({ message: 'Order total must be above zero' });
    const order = await Order.create(
      buildOrderDoc({ userId: req.user && req.user._id, orderItems, subtotal, discount, shipping, total, coupon, addr, email, body: req.body, method: 'stripe' })
    );
    if (coupon) await consumeCoupon(order, coupon, subtotal, shipping);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      receipt_email: email,
      metadata: { orderId: order._id.toString() },
    });
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
      if (order.status === 'pending') order.status = 'confirmed';
      order.payment.status = 'paid';
      order.payment.txnId = intent.id;
      await order.save();
    } else if (intent.status === 'requires_payment_method' || intent.status === 'canceled') {
      order.payment.status = 'failed';
      await order.save();
    }
    res.json({ order, paymentStatus: intent.status });
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
            if (order.status === 'pending') order.status = 'confirmed';
            order.payment.status = 'paid';
            order.payment.txnId = intent.id;
          } else {
            order.payment.status = 'failed';
            order.payment.txnId = intent.id;
          }
          await order.save();
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
