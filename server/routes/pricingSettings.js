const express = require('express');
const PricingSettings = require('../models/PricingSettings');
const Product = require('../models/Product');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const SETTINGS_FIELDS = [
  'goldRate24ktInr', 'diamondRatePerCaratInr', 'karatPurityPct',
  'makingChargesPct', 'shippingFlatInr', 'profitMarginPct', 'profitMarginFlatInr',
  'usdInrRate', 'roundToNearestInr', 'roundToNearestUsd',
];
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

async function loadOrCreateSettings() {
  let settings = await PricingSettings.findById('global');
  if (!settings) settings = await PricingSettings.create({ _id: 'global' });
  return settings;
}

// Recomputes every auto-priced product with a recorded metal weight, using
// the given settings. Sequential (not Promise.all) so one bad document
// (e.g. a now-invalid compareAtPrice) can't abort the whole batch — each
// save's error is isolated into `failed[]` instead.
async function bulkRecompute(settings) {
  const products = await Product.find({ autoPriced: true, 'details.metalWeightGrams': { $gt: 0 } });
  const failed = [];
  let updated = 0;
  for (const p of products) {
    p.$locals.pricingSettings = settings; // avoids an N+1 settings fetch per product
    try {
      await p.save();
      updated++;
    } catch (e) {
      failed.push({ id: p._id, name: p.name, error: e.message });
    }
  }
  return { updated, failed };
}

router.get('/', authRequired, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await loadOrCreateSettings());
  } catch (e) {
    next(e);
  }
});

router.put('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const body = pick(req.body, SETTINGS_FIELDS);
    const settings = await loadOrCreateSettings();
    settings.set(body);
    await settings.save();
    const { updated, failed } = await bulkRecompute(settings);
    res.json({ settings, updated, failed });
  } catch (e) {
    e.status = e.status || 400;
    next(e);
  }
});

// Re-price the catalog against the currently-stored settings, without
// changing any rate — for "I just filled in one product's weight."
router.post('/recompute', authRequired, requireAdmin, async (_req, res, next) => {
  try {
    const settings = await loadOrCreateSettings();
    const { updated, failed } = await bulkRecompute(settings);
    res.json({ updated, failed });
  } catch (e) {
    e.status = e.status || 400;
    next(e);
  }
});

module.exports = router;
