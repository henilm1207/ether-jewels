// Shared checkout pricing — single source of truth for order totals.
// Used by POST /api/orders (manual pending orders) AND the Stripe/PayPal
// routes, so a gateway can never charge a different total than the DB order.
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { isRingCategory } = require('../config/catalog');

const round2 = (n) => Math.round(n * 100) / 100;
const MAX_ITEMS = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateContactAddress(shippingAddress, contact) {
  const addr = shippingAddress || {};
  for (const f of ['fullName', 'line1', 'city', 'country', 'zip']) {
    if (!addr[f] || typeof addr[f] !== 'string' || !addr[f].trim())
      throw bad(400, `shippingAddress.${f} required`);
  }
  const email = (contact && contact.email ? String(contact.email) : '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw bad(400, 'contact.email invalid');
  return { addr, email };
}

// Prices the cart, validates sizes/metals/stock. Returns everything the
// caller needs to create the Order (coupon incremented separately, after).
async function quoteCart(items, couponCode) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS)
    throw bad(400, `items[] must contain 1-${MAX_ITEMS} entries`);

  let subtotal = 0;
  const orderItems = [];

  const ids = items.map((it) => it && it.product).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const found = await Product.find({ _id: { $in: ids }, status: 'active' });
  const byId = new Map(found.map((p) => [p._id.toString(), p]));

  for (const it of items) {
    const idStr = it && it.product ? String(it.product) : '';
    const product = byId.get(idStr);
    if (!product) throw bad(400, `Product ${idStr || '?'} unavailable`);
    if (product.inStock === false) throw bad(400, `${product.name} is out of stock`);

    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10)
      throw bad(400, `Invalid qty for ${product.name} (1-10)`);

    const karat = it.karat;
    if (karat !== undefined && karat !== '10KT' && karat !== '14KT' && karat !== '18KT')
      throw bad(400, `Invalid karat for ${product.name}`);
    const useKarat = karat || '14KT';

    let variant = null;
    if (it.metalColor != null) {
      // Case-insensitive: admin renames/case edits must not break live carts.
      const wanted = String(it.metalColor).trim().toLowerCase();
      variant = product.variants.find((v) => String(v.material || v.name || '').trim().toLowerCase() === wanted);
      if (!variant) throw bad(400, `Invalid metalColor for ${product.name}`);
    } else {
      variant = product.variants[0];
    }
    if (!variant) throw bad(400, `${product.name} has no variants`);
    // The admin in-stock flag is real: never sell a flagged-out metal.
    if (variant.inStock === false)
      throw bad(400, `${product.name} (${variant.material || variant.name || 'this metal'}) is out of stock`);

    const base = variant.price;
    const ktDeltas = { '10KT': product.kt10Delta || 0, '18KT': product.kt18Delta || 0 };
    const unitPrice = round2(base + (ktDeltas[useKarat] || 0));

    const ring = isRingCategory(product.category);
    if (ring) {
      if (!it.size || !product.sizes.includes(String(it.size)))
        throw bad(400, `Valid ring size required for ${product.name}`);
    } else if (it.size) {
      throw bad(400, `Size not applicable for ${product.name}`);
    }

    const lineTotal = round2(unitPrice * qty);
    subtotal = round2(subtotal + lineTotal);
    orderItems.push({
      product: product._id,
      sku: product.styleCode || null,
      name: product.name,
      image: variant.image || product.images[0],
      category: product.category,
      metal: { karat: useKarat, color: variant.material || variant.name || null },
      size: it.size ? String(it.size) : null,
      qty,
      unitPrice,
      lineTotal,
    });
  }

  // Whole-cart cap (mirrors client MAX_CART_QTY in config.js — keep in sync).
  // Bulk buyers go through the Contact page instead of online checkout.
  const MAX_CART_QTY = 5;
  const totalQty = orderItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  if (totalQty > MAX_CART_QTY)
    throw bad(400, `Cart limit is ${MAX_CART_QTY} items — please contact us for bulk orders`);

  let discount = 0;
  let coupon = null;
  if (couponCode != null && String(couponCode).trim() !== '') {
    const code = String(couponCode).trim().toUpperCase();
    coupon = await Coupon.findOne({ code });
    if (!coupon) throw bad(400, 'Invalid coupon');
    const check = coupon.isUsable(subtotal);
    if (!check.ok) throw bad(400, check.reason);
    discount = coupon.calcDiscount(subtotal);
  }

  const shipping = 0; // free worldwide over $1000 (matches PDP)
  const total = round2(Math.max(0, subtotal - discount + shipping));
  return { orderItems, subtotal, discount, coupon, shipping, total };
}

// Atomic coupon increment AFTER the order row exists.
async function consumeCoupon(order, coupon, subtotal, shipping) {
  if (!coupon || order.couponConsumed) return;
  const updated = await Coupon.findOneAndUpdate(
    { _id: coupon._id, $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  if (!updated && coupon.maxUses != null) {
    order.couponCode = null;
    order.pricing.discount = 0;
    order.pricing.total = round2(subtotal + shipping);
  }
  // Exhausted by this use — auto-switch off (tracked via autoOff so a
  // later release can tell it apart from an owner/admin manual off).
  if (updated && updated.maxUses != null && updated.usedCount >= updated.maxUses && updated.active) {
    await Coupon.updateOne({ _id: coupon._id, active: true }, { $set: { active: false, autoOff: true } });
  }
  order.couponConsumed = true;
  await order.save();
}

// Release a consumed coupon (fail/cancel/expiry). Idempotent via the flag.
// Reactivates ONLY auto-switched-off coupons whose capacity freed up and
// which are not expired — an owner/admin manual off is never overridden.
async function releaseCoupon(order) {
  if (!order || !order.couponCode || !order.couponConsumed) return;
  const updated = await Coupon.findOneAndUpdate(
    { code: order.couponCode, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
    { new: true }
  );
  if (updated && updated.autoOff && (updated.maxUses == null || updated.usedCount < updated.maxUses)) {
    const now = new Date();
    if (!updated.expiresAt || updated.expiresAt > now) {
      await Coupon.updateOne({ _id: updated._id, autoOff: true }, { $set: { active: true, autoOff: false } });
    } else {
      // Expired while off — drop the auto flag so it reads as a plain off.
      await Coupon.updateOne({ _id: updated._id }, { $set: { autoOff: false } });
    }
  }
  order.couponConsumed = false;
  await order.save();
}

// Settle an order PAID: consume its coupon (looked up by code, since reuse
// paths may not hold the doc), clear expiry. Safe to call twice.
async function onPaymentSuccess(order, txnId) {
  if (order.status === 'pending') order.status = 'confirmed';
  order.payment.status = 'paid';
  if (txnId) order.payment.txnId = txnId;
  order.expiresAt = null;
  if (order.couponCode && !order.couponConsumed) {
    const coupon = await Coupon.findOne({ code: order.couponCode });
    if (coupon) {
      await consumeCoupon(order, coupon, order.pricing.subtotal, order.pricing.shipping);
    } else {
      order.couponConsumed = true; // code gone — stop retrying
      await order.save();
    }
  } else {
    await order.save();
  }
  // Order confirmation mail — fire-and-forget: a mail hiccup must never
  // fail or delay a paid order (failures log with the order id for retry).
  try {
    const { sendOrderConfirmation } = require('./mail');
    sendOrderConfirmation(order);
  } catch (e) {
    console.error(`order mail hook failed for ${order._id}:`, e.message);
  }
}

// Mark FAILED and release any consumed coupon (no-op unless consumed).
// A settled (paid) order never moves backwards on late failure events.
async function onPaymentFailed(order, txnId) {
  if (order.payment.status === 'paid') return;
  order.payment.status = 'failed';
  if (txnId) order.payment.txnId = txnId;
  await releaseCoupon(order);
  await order.save();
}

// Order view gating — payment echo endpoints must not become PII oracles.
// Owner/admin see everything; anyone else gets a PII-free receipt
// (enough for the success screen: id, status, total, payment state).
function publicOrderView(order) {
  return {
    _id: order._id,
    status: order.status,
    pricing: { total: order.pricing.total, currency: order.pricing.currency },
    payment: { status: order.payment.status },
  };
}

function orderView(order, req) {
  const ownerId = order.user ? String(order.user) : null;
  const callerId = req.user ? String(req.user._id) : null;
  const isAdmin = !!(req.user && req.user.role === 'admin');
  if (ownerId) {
    if (ownerId === callerId || isAdmin) return { order };
    const err = new Error('Not your order');
    err.status = 403;
    return { error: err };
  }
  if (isAdmin || (callerId && order.contact && req.user && req.user.email === order.contact.email)) {
    return { order };
  }
  return { order: publicOrderView(order) };
}

module.exports = { round2, MAX_ITEMS, validateContactAddress, quoteCart, consumeCoupon, releaseCoupon, onPaymentSuccess, onPaymentFailed, publicOrderView, orderView };
