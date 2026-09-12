// Account cart — follows login across devices. Guests keep localStorage;
// on login the guest cart merges once, then the server is the source of
// truth (checkout re-prices everything, so stored prices can't leak through).
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const MAX_LINES = 20;
const PRODUCT_PUBLIC = 'name slug price compareAtPrice images sizes defaultSize variants category';

const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const cleanQty = (q) => {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, n));
};

// Drop lines pointing at missing/inactive products; sanitize the rest.
async function cleanLines(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_LINES) : [];
  const ids = [...new Set(list.map((l) => l && l.product).filter(mongoose.isValidObjectId))];
  const found = ids.length
    ? await Product.find({ _id: { $in: ids }, status: 'active' }).select('_id')
    : [];
  const alive = new Set(found.map((p) => String(p._id)));
  const out = [];
  for (const l of list) {
    if (!l || !alive.has(String(l.product || ''))) continue;
    const v = (l && l.variant) || {};
    const price = Number(v.price);
    out.push({
      key: cleanStr(l.key, 200) || `${l.product}|${(v.material || v.name || 'default')}|${v.kt || '14KT'}|${l.size || ''}`,
      product: l.product,
      variant: {
        name: cleanStr(v.name, 100),
        material: cleanStr(v.material, 100),
        kt: cleanStr(v.kt, 10),
        price: Number.isFinite(price) && price >= 0 ? price : undefined,
        image: cleanStr(v.image, 500),
      },
      size: cleanStr(l.size, 10),
      qty: cleanQty(l.qty),
    });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

async function populatedCart(user) {
  await user.populate({ path: 'cart.product', select: PRODUCT_PUBLIC });
  return (user.cart || [])
    .filter((l) => l && l.product && l.product._id)
    .map((l) => ({
      key: l.key,
      product: l.product,
      variant: l.variant || null,
      size: l.size || undefined,
      qty: l.qty,
    }));
}

// GET /api/cart — account lines with product details for display.
router.get('/', authRequired, async (req, res, next) => {
  try {
    // Prune dead lines so removed/unlisted products vanish from the cart.
    req.user.cart = await cleanLines(req.user.cart);
    await req.user.save();
    res.json({ items: await populatedCart(req.user) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/cart — replace whole cart. Body {items:[{key,product,variant,size,qty}]}.
router.put('/', authRequired, async (req, res, next) => {
  try {
    req.user.cart = await cleanLines((req.body || {}).items);
    await req.user.save();
    res.json({ items: await populatedCart(req.user) });
  } catch (e) {
    next(e);
  }
});

// POST /api/cart/merge — union guest lines in (qty sums, capped). Once per login.
router.post('/merge', authRequired, async (req, res, next) => {
  try {
    const incoming = await cleanLines((req.body || {}).items);
    const byKey = new Map((req.user.cart || []).map((l) => [l.key, l]));
    for (const l of incoming) {
      const cur = byKey.get(l.key);
      if (cur) {
        cur.qty = cleanQty(cur.qty + l.qty);
      } else if (byKey.size < MAX_LINES) {
        byKey.set(l.key, l);
      }
    }
    req.user.cart = [...byKey.values()].slice(0, MAX_LINES);
    await req.user.save();
    res.json({ items: await populatedCart(req.user) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
