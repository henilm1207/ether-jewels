// Account wishlist (favourites) — one Wishlist doc per user (see
// models/Wishlist). Guests keep localStorage (id+slug pairs); on login the
// guest ids union in (no duplicates). Moves between bag and wishlist are
// handled here and in routes/bag.js.
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const {
  MAX_LINES,
  MAX_QTY,
  MAX_FAVS,
  cleanQty,
  cleanLines,
  cleanWishlistIds,
  getOrCreateBag,
  getOrCreateWishlist,
  populatedBag,
  populatedWishlist,
  retryWrite,
} = require('../lib/bagLines');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const wishlistIds = (list) => (list.items || []).map((it) => String(it.product));

// GET /api/wishlist — favourites with product details, newest first.
// Dead products are pruned (reported as removed count, never silent).
router.get('/', authRequired, async (req, res, next) => {
  try {
    const list = await getOrCreateWishlist(req.user._id);
    const ids = wishlistIds(list);
    let removed = 0;
    if (ids.length > 0) {
      const found = await Product.find({ _id: { $in: ids }, status: 'active' }).select('_id');
      const alive = new Set(found.map((p) => String(p._id)));
      const before = list.items.length;
      list.items = list.items.filter((it) => alive.has(String(it.product)));
      removed = before - list.items.length;
      if (removed > 0) await list.save();
    }
    res.json({ items: await populatedWishlist(list), removed });
  } catch (e) {
    next(e);
  }
});

// POST /api/wishlist — add one favourite. Body {product: productId}.
// Idempotent: re-adding moves nothing and duplicates never. 404 when the
// product is missing/inactive (favs must always be buyable-later).
router.post('/', authRequired, async (req, res, next) => {
  try {
    const productId = req.body && typeof req.body.product === 'string' ? req.body.product : '';
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product' });
    }
    const product = await Product.findOne({ _id: productId, status: 'active' }).select('_id');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const list = await getOrCreateWishlist(req.user._id);
    if (!list.items.some((it) => String(it.product) === String(productId))) {
      list.items.unshift({ product: productId, addedAt: new Date() });
      list.items = list.items.slice(0, MAX_FAVS);
      await list.save();
    }
    res.status(201).json({ items: await populatedWishlist(list), wishlist: wishlistIds(list) });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/wishlist/:productId — remove one favourite.
router.delete('/:productId', authRequired, async (req, res, next) => {
  try {
    const list = await getOrCreateWishlist(req.user._id);
    const before = list.items.length;
    list.items = list.items.filter((it) => String(it.product) !== String(req.params.productId));
    if (list.items.length !== before) await list.save();
    res.json({ items: await populatedWishlist(list), wishlist: wishlistIds(list) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/wishlist — replace whole wishlist (cart-style write-through).
// Body {ids:[productId...]}. Response {items, wishlist, dropped, droppedAll}:
// dropped counts input ids with no surviving product, droppedAll (sent
// non-empty, kept none) lets the client keep its local copy instead of
// wiping the display over a stale catalog.
router.put('/', authRequired, async (req, res, next) => {
  try {
    const raw = Array.isArray((req.body || {}).ids) ? req.body.ids : [];
    const clean = cleanWishlistIds(raw);
    // Idempotent replace — safe to replay after a write collision.
    const result = await retryWrite(async () => {
      let valid = [];
      if (clean.length) {
        const found = await Product.find({ _id: { $in: clean }, status: 'active' }).select('_id');
        const alive = new Set(found.map((p) => String(p._id)));
        // Preserve client order (newest-first display), drop dead ids.
        valid = clean.filter((id) => alive.has(id));
      }
      const list = await getOrCreateWishlist(req.user._id);
      const prevById = new Map((list.items || []).map((it) => [String(it.product), it]));
      const now = new Date();
      list.items = valid.map((id) => prevById.get(id) || { product: id, addedAt: now });
      await list.save();
      return {
        items: await populatedWishlist(list),
        wishlist: wishlistIds(list),
        dropped: clean.length - valid.length,
        droppedAll: clean.length > 0 && valid.length === 0,
      };
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// POST /api/wishlist/merge — union guest favs into the account (auth).
// Body {ids: [productId...]}; capped, validated, active-only.
router.post('/merge', authRequired, async (req, res, next) => {
  try {
    const clean = cleanWishlistIds((req.body || {}).ids);
    let valid = [];
    if (clean.length) {
      const found = await Product.find({ _id: { $in: clean }, status: 'active' }).select('_id');
      valid = found.map((p) => String(p._id));
    }
    const list = await getOrCreateWishlist(req.user._id);
    const have = new Set(wishlistIds(list));
    for (const id of valid) {
      if (!have.has(id) && list.items.length < MAX_FAVS) {
        list.items.push({ product: id, addedAt: new Date() });
        have.add(id);
      }
    }
    await list.save();
    res.json({ items: await populatedWishlist(list), wishlist: wishlistIds(list) });
  } catch (e) {
    next(e);
  }
});

// POST /api/wishlist/move-to-bag — favourite -> bag line. Body
// {line: {key, variant, size, qty}, product: productId}. Same-key bag lines
// sum (capped); the favourite is removed. Ring sizes are enforced by the
// line key — clients deep-link size-less rings to the PDP instead.
router.post('/move-to-bag', authRequired, async (req, res, next) => {
  try {
    const productId = req.body && typeof req.body.product === 'string' ? req.body.product : '';
    const rawLine = req.body && req.body.line;
    if (!mongoose.isValidObjectId(productId) || !rawLine || typeof rawLine.key !== 'string') {
      return res.status(400).json({ message: 'product and line.key required' });
    }
    const cleaned = await cleanLines([{ ...rawLine, product: productId }]);
    if (cleaned.lines.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const line = cleaned.lines[0];
    const bag = await getOrCreateBag(req.user._id);
    const cur = (bag.items || []).find((l) => l && l.key === line.key);
    if (cur) {
      cur.qty = Math.min(MAX_QTY, (Number(cur.qty) || 0) + cleanQty(line.qty));
    } else if (bag.items.length < MAX_LINES) {
      bag.items.push(line);
    } else {
      return res.status(400).json({ message: 'Bag is full' });
    }
    const list = await getOrCreateWishlist(req.user._id);
    list.items = list.items.filter((it) => String(it.product) !== String(productId));
    await bag.save();
    await list.save();
    res.json({ bag: await populatedBag(bag), wishlist: wishlistIds(list) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
