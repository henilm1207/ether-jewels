// SkyDo bank-wire collection (international) — NOT a live gateway. SkyDo has
// no public self-serve API: it's a cross-border collections platform that
// gives exporters local virtual bank accounts abroad. A customer wires funds
// there directly; there's no programmatic "charge" step we can call.
// So this route: prices the cart the same way as every other checkout path,
// creates the order as `awaiting_transfer` with a reference id, and returns
// the right virtual-account details for the customer's chosen currency.
// Confirmation is a manual admin action (PATCH /:orderId/confirm) until
// SkyDo provisions real API/webhook docs — /webhook below is a placeholder
// for that day, not a working integration.
const express = require('express');
const Order = require('../../models/Order');
const { validateContactAddress, quoteCart, buildPendingOrderDoc, onPaymentSuccess } = require('../../lib/quote');
const { authOptional, authRequired, requireAdmin } = require('../../middleware/auth');
const { sendWireInstructions } = require('../../lib/mail');

const router = express.Router();
// Bank wires legitimately take a few business days — much longer than the
// 24h TTL other gateways use. Reuses the existing expiry sweeper unmodified.
const WIRE_ORDER_TTL_MS = 5 * 24 * 60 * 60 * 1000;

const WIRE_ACCOUNTS = {
  USD: () =>
    process.env.SKYDO_USD_ACCOUNT_NUMBER
      ? {
          currency: 'USD',
          bankName: process.env.SKYDO_USD_BANK_NAME || '',
          accountHolder: process.env.SKYDO_USD_ACCOUNT_HOLDER || '',
          routingNumber: process.env.SKYDO_USD_ROUTING_NUMBER || '',
          accountNumber: process.env.SKYDO_USD_ACCOUNT_NUMBER,
        }
      : null,
  GBP: () =>
    process.env.SKYDO_GBP_ACCOUNT_NUMBER
      ? {
          currency: 'GBP',
          bankName: process.env.SKYDO_GBP_BANK_NAME || '',
          accountHolder: process.env.SKYDO_GBP_ACCOUNT_HOLDER || '',
          sortCode: process.env.SKYDO_GBP_SORT_CODE || '',
          accountNumber: process.env.SKYDO_GBP_ACCOUNT_NUMBER,
        }
      : null,
  EUR: () =>
    process.env.SKYDO_EUR_IBAN
      ? {
          currency: 'EUR',
          bankName: process.env.SKYDO_EUR_BANK_NAME || '',
          accountHolder: process.env.SKYDO_EUR_ACCOUNT_HOLDER || '',
          iban: process.env.SKYDO_EUR_IBAN,
          bic: process.env.SKYDO_EUR_BIC || '',
        }
      : null,
};

function availableCurrencies() {
  return Object.keys(WIRE_ACCOUNTS).filter((c) => WIRE_ACCOUNTS[c]());
}

// POST /api/payments/skydo/create — cart + contact + wireCurrency ->
// {orderId, instructions}. No payment confirmation happens here.
router.post('/create', authOptional, async (req, res, next) => {
  try {
    const { items, couponCode, shippingAddress, contact, idempotencyKey, wireCurrency } = req.body || {};
    const currency = ['USD', 'GBP', 'EUR'].includes(wireCurrency) ? wireCurrency : null;
    if (!currency) return res.status(400).json({ message: 'wireCurrency must be USD, GBP, or EUR' });
    const account = WIRE_ACCOUNTS[currency]();
    if (!account) return res.status(503).json({ message: `Bank wire (${currency}) not configured yet` });
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
        ...buildPendingOrderDoc({ userId: req.user && req.user._id, orderItems: q.orderItems, subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, total: q.total, coupon: q.coupon, addr, email, body: req.body, method: 'skydo' }),
        idempotencyKey: key || null,
        expiresAt: new Date(Date.now() + WIRE_ORDER_TTL_MS),
      });
      order.payment.status = 'awaiting_transfer';
      order.payment.wireCurrency = currency;
      order.payment.wireReference = `EJ-${order._id.toString().slice(-8).toUpperCase()}`;
      await order.save();
    }
    const instructions = { ...account, reference: order.payment.wireReference, amountUsd: order.pricing.total };
    try {
      await sendWireInstructions(order, instructions);
    } catch (e) {
      console.error(`wire instructions mail failed for ${order._id}:`, e.message);
    }
    res.status(201).json({ orderId: order._id, instructions });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

// PATCH /api/payments/skydo/:orderId/confirm — admin marks a bank-wire
// order paid once SkyDo/the bank confirms receipt. Reuses the same
// settlement path (coupon consume, confirmation email) as every other gateway.
router.patch('/:orderId/confirm', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.payment.method !== 'skydo') return res.status(400).json({ message: 'Not a bank-wire order' });
    if (order.payment.status !== 'paid') await onPaymentSuccess(order, `manual:${req.user._id}`);
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

// POST /api/payments/skydo/webhook — PLACEHOLDER. SkyDo has no published
// webhook schema yet; this exists so one exists to point SkyDo at once they
// provision API access, gated behind a shared secret in the meantime.
// Replace the body-shape assumptions below with SkyDo's real payload once known.
router.post('/webhook', async (req, res, next) => {
  try {
    const secret = process.env.SKYDO_WEBHOOK_SECRET;
    if (!secret) return res.status(404).json({ message: 'Not configured' });
    const provided = req.headers['x-skydo-webhook-secret'];
    if (!provided || provided !== secret) return res.status(401).json({ message: 'Invalid webhook credentials' });
    const { orderReference, status } = req.body || {};
    if (!orderReference) return res.status(400).json({ message: 'orderReference required' });
    const order = await Order.findOne({ 'payment.wireReference': orderReference, 'payment.method': 'skydo' });
    if (order && status === 'completed' && order.payment.status !== 'paid') {
      await onPaymentSuccess(order, `skydo-webhook:${Date.now()}`);
    }
    res.json({ received: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
module.exports.availableCurrencies = availableCurrencies;
