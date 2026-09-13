// Account bag — Amazon/Myntra-style. One Bag doc per user (see
// models/Bag): `items` is the checkout bag, `savedForLater` the shelf.
// Guests keep localStorage; on login the guest bag merges once (quantities
// SUM, capped — like Amazon), then the server is the source of truth.
// Checkout re-prices everything via lib/quote, so stored prices can't leak.
const express = require('express');
const {
  MAX_LINES,
  MAX_QTY,
  cleanQty,
  cleanLines,
  retryWrite,
  getOrCreateBag,
  populatedBag,
} = require('../lib/bagLines');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Prune dead lines from a bag section; returns the dropped count.
async function pruneSection(bag, section) {
  const cleaned = await cleanLines(bag[section]);
  bag[section] = cleaned.lines;
  return cleaned.dropped;
}

// GET /api/bag — bag + saved-for-later with product details for display.
// Dead lines are pruned (reported as counts, never silent).
router.get('/', authRequired, async (req, res, next) => {
  try {
    const bag = await getOrCreateBag(req.user._id);
    const removedFromBag = await pruneSection(bag, 'items');
    const removedFromSaved = await pruneSection(bag, 'savedForLater');
    await bag.save();
    res.json({ ...(await populatedBag(bag)), removedFromBag, removedFromSaved });
  } catch (e) {
    next(e);
  }
});

// PUT /api/bag — replace whole bag. Body {items:[{key,product,variant,size,qty}]}
// (a bare array is also accepted — the storefront write-through sync sends
// the line array directly). Response {items, saved, dropped, droppedAll}:
// droppedAll (sent non-empty, kept none) lets the client keep its local copy
// instead of wiping the display over a stale catalog.
router.put('/', authRequired, async (req, res, next) => {
  try {
    const rawBody = req.body || {};
    const rawItems = Array.isArray(rawBody) ? rawBody : rawBody.items;
    // Idempotent replace, so a colliding concurrent writer just retries with
    // a fresh fetch instead of 500ing with a VersionError.
    const result = await retryWrite(async () => {
      const bag = await getOrCreateBag(req.user._id);
      const cleaned = await cleanLines(rawItems);
      bag.items = cleaned.lines;
      await bag.save();
      return {
        ...(await populatedBag(bag)),
        dropped: cleaned.dropped,
        droppedAll: Array.isArray(rawItems) && rawItems.length > 0 && cleaned.lines.length === 0,
      };
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/bag/lines — set one line's qty. Body {key, qty}; qty <= 0
// removes the line. Response {items, saved}.
router.patch('/lines', authRequired, async (req, res, next) => {
  try {
    const bag = await getOrCreateBag(req.user._id);
    const key = req.body && typeof req.body.key === 'string' ? req.body.key : '';
    const qty = Math.floor(Number(req.body && req.body.qty));
    const idx = (bag.items || []).findIndex((l) => l && l.key === key);
    if (idx === -1) return res.status(404).json({ message: 'Line not found' });
    if (!Number.isFinite(qty) || qty <= 0) {
      bag.items.splice(idx, 1);
    } else {
      bag.items[idx].qty = cleanQty(qty);
    }
    await bag.save();
    res.json(await populatedBag(bag));
  } catch (e) {
    next(e);
  }
});

// POST /api/bag/save-for-later — move a bag line to the shelf. Body {key}.
router.post('/save-for-later', authRequired, async (req, res, next) => {
  try {
    const bag = await getOrCreateBag(req.user._id);
    const key = req.body && typeof req.body.key === 'string' ? req.body.key : '';
    const idx = (bag.items || []).findIndex((l) => l && l.key === key);
    if (idx === -1) return res.status(404).json({ message: 'Line not found' });
    const [line] = bag.items.splice(idx, 1);
    if (!(bag.savedForLater || []).some((l) => l && l.key === key)) {
      bag.savedForLater.push(line);
    }
    await bag.save();
    res.json(await populatedBag(bag));
  } catch (e) {
    next(e);
  }
});

// POST /api/bag/move-to-bag — move a shelf line back to the bag. Same-key
// lines sum (capped), mirroring merge semantics.
router.post('/move-to-bag', authRequired, async (req, res, next) => {
  try {
    const bag = await getOrCreateBag(req.user._id);
    const key = req.body && typeof req.body.key === 'string' ? req.body.key : '';
    const idx = (bag.savedForLater || []).findIndex((l) => l && l.key === key);
    if (idx === -1) return res.status(404).json({ message: 'Line not found' });
    const [line] = bag.savedForLater.splice(idx, 1);
    const cur = (bag.items || []).find((l) => l && l.key === key);
    if (cur) {
      cur.qty = Math.min(MAX_QTY, (Number(cur.qty) || 0) + (Number(line.qty) || 0));
    } else if (bag.items.length < MAX_LINES) {
      bag.items.push(line);
    } else {
      // Bag full — put it back on the shelf rather than losing it.
      bag.savedForLater.splice(idx, 0, line);
      return res.status(400).json({ message: 'Bag is full' });
    }
    await bag.save();
    res.json(await populatedBag(bag));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/bag/saved — remove one shelf line. Body {key}.
router.delete('/saved', authRequired, async (req, res, next) => {
  try {
    const bag = await getOrCreateBag(req.user._id);
    const key = req.body && typeof req.body.key === 'string' ? req.body.key : '';
    const before = (bag.savedForLater || []).length;
    bag.savedForLater = (bag.savedForLater || []).filter((l) => !(l && l.key === key));
    if (bag.savedForLater.length !== before) await bag.save();
    res.json(await populatedBag(bag));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
