// Shared bag/wishlist line sanitizer — single source of truth for every
// route that reads or writes bag lines, so bag, merge, and move-to-bag all
// enforce the same caps and catalog checks.
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Bag = require('../models/Bag');
const Wishlist = require('../models/Wishlist');

const MAX_LINES = 20;
const MAX_QTY = 10; // matches lib/quote (qty 1..10) and the storefront stepper
const MAX_FAVS = 100; // wishlist cap — mirrors client MAX_FAVS
const PRODUCT_PUBLIC = 'name slug price compareAtPrice images sizes defaultSize variants category';

const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const cleanQty = (q) => {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY, Math.max(1, n));
};

// Drop lines pointing at missing/inactive products; sanitize + clamp rest.
// Returns {lines, dropped} — dropped counts input lines with no surviving
// product, so callers can report removals instead of silently emptying bags.
async function cleanLines(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_LINES) : [];
  const ids = [...new Set(list.map((l) => l && l.product).filter(mongoose.isValidObjectId))];
  const found = ids.length
    ? await Product.find({ _id: { $in: ids }, status: 'active' }).select('_id')
    : [];
  const alive = new Set(found.map((p) => String(p._id)));
  const out = [];
  let dropped = 0;
  for (const l of list) {
    if (!l || !alive.has(String(l.product || ''))) { dropped += 1; continue; }
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
  return { lines: out, dropped };
}

async function getOrCreateBag(userId) {
  const bag = await Bag.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [], savedForLater: [] } },
    { upsert: true, new: true }
  );
  return bag;
}

async function getOrCreateWishlist(userId) {
  const list = await Wishlist.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, new: true }
  );
  return list;
}

// Display shape for bag lines (populated product for rendering).
async function populatedBag(bag) {
  await bag.populate([
    { path: 'items.product', select: PRODUCT_PUBLIC },
    { path: 'savedForLater.product', select: PRODUCT_PUBLIC },
  ]);
  const show = (l) => ({
    key: l.key,
    product: l.product,
    variant: l.variant || null,
    size: l.size || undefined,
    qty: l.qty,
  });
  return {
    items: (bag.items || []).filter((l) => l && l.product && l.product._id).map(show),
    saved: (bag.savedForLater || []).filter((l) => l && l.product && l.product._id).map(show),
  };
}

async function populatedWishlist(list) {
  await list.populate({ path: 'items.product', select: PRODUCT_PUBLIC });
  return (list.items || [])
    .filter((it) => it && it.product && it.product._id)
    .map((it) => ({ product: it.product, addedAt: it.addedAt }));
}

// Dedupe + ObjectId-filter + cap for wishlist id lists. Shared by PUT
// replace and POST merge so both enforce the same rules.
function cleanWishlistIds(raw) {
  const list = Array.isArray(raw) ? raw.map(String) : [];
  return [...new Set(list)].filter(mongoose.isValidObjectId).slice(0, MAX_FAVS);
}

// Re-run a whole write operation when it collides with a concurrent writer.
// Overlapping fetch-modify-save cycles on one doc throw VersionError;
// concurrent first-touch upserts throw E11000. Re-running the operation
// re-fetches fresh docs, so the next attempt converges instead of 500ing.
// Retries are jittered so colliding parties stop stepping on each other.
// Only for idempotent operations (whole-state PUT replace) — callers must
// ensure replay is safe.
async function retryWrite(operation, retries = 3) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 30 * attempt + Math.floor(Math.random() * 60)));
    }
    try {
      return await operation();
    } catch (e) {
      lastError = e;
      const collided = e && (e.name === 'VersionError' || e.code === 11000);
      if (!collided || attempt >= retries) throw e;
    }
  }
  throw lastError;
}

module.exports = {
  MAX_LINES,
  MAX_QTY,
  MAX_FAVS,
  PRODUCT_PUBLIC,
  cleanQty,
  cleanLines,
  cleanWishlistIds,
  retryWrite,
  getOrCreateBag,
  getOrCreateWishlist,
  populatedBag,
  populatedWishlist,
};
