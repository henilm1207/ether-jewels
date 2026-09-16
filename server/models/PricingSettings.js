const mongoose = require('mongoose');

// Singleton — one global document at _id 'global'. Rates default to 0,
// which server/lib/pricing.js treats as "not configured yet" and skips
// auto-pricing rather than computing from a zero rate.
const pricingSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global' },
    goldRate24ktInr: { type: Number, default: 0, min: 0 },
    diamondRatePerCaratInr: { type: Number, default: 0, min: 0 },
    karatPurityPct: {
      '10KT': { type: Number, default: 50, min: 0, max: 100 },
      '14KT': { type: Number, default: 65, min: 0, max: 100 },
      '18KT': { type: Number, default: 84, min: 0, max: 100 },
    },
    // "Kharcho" gross-up — capped below 100 so 1 - pct/100 stays positive.
    makingChargesPct: { type: Number, default: 6, min: 0, max: 95 },
    shippingFlatInr: { type: Number, default: 5000, min: 0 },
    profitMarginPct: { type: Number, default: 50, min: 0 },
    profitMarginFlatInr: { type: Number, default: 50000, min: 0 },
    usdInrRate: { type: Number, default: 96, min: 0.01 },
    roundToNearestInr: { type: Number, default: 500, min: 1 },
    roundToNearestUsd: { type: Number, default: 50, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingSettings', pricingSettingsSchema);
