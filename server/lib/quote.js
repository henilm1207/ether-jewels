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
    if (karat !== undefined && karat !== '14KT' && karat !== '18KT')
      throw bad(400, `Invalid karat for ${product.name}`);
    const useKarat = karat || '14KT';

    let variant = null;
    if (it.metalColor != null) {
      const wanted = String(it.metalColor).trim();
      variant = product.variants.find((v) => (v.material || v.name) === wanted);
      if (!variant) throw bad(400, `Invalid metalColor for ${product.name}`);
    } else {
      variant = product.variants[0];
    }
    if (!variant) throw bad(400, `${product.name} has no variants`);

    const base = variant.price;
    const unitPrice = round2(base + (useKarat === '18KT' ? product.kt18Delta || 0 : 0));

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
  const updated = await Coupon.findOneAndUpdate(
    { _id: coupon._id, $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  if (!updated && coupon.maxUses != null) {
    order.couponCode = null;
    order.pricing.discount = 0;
    order.pricing.total = round2(subtotal + shipping);
    await order.save();
  }
}

module.exports = { round2, MAX_ITEMS, validateContactAddress, quoteCart, consumeCoupon };
