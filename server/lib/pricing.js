// Automatic gold/diamond pricing — single source of truth for the formula
// decoded from the owner's pricing spreadsheet. Pure, no Mongoose import,
// so it's usable from a `node -e` sanity check without a DB connection.

// Absorbs float dust from chained division/multiplication before ceiling,
// so a value that "should" land exactly on a multiple of `step` doesn't
// get pushed up to the next one by e.g. 999.9999999999998 vs 1000.
function ceilToNearest(value, step) {
  const ratio = Math.round((value / step) * 1e6) / 1e6;
  return Math.ceil(ratio) * step;
}

// { price, kt18Delta, kt10Delta } at the karat-purity table in `settings`,
// or null when settings aren't configured yet (caller must leave the
// product's existing price untouched in that case).
function computeProductPricing(settings, { metalWeightGrams, diamondCaratWeight }) {
  if (
    !settings ||
    !(settings.goldRate24ktInr > 0) ||
    !(settings.usdInrRate > 0) ||
    !(settings.roundToNearestInr > 0) ||
    !(settings.roundToNearestUsd > 0) ||
    !(settings.makingChargesPct < 100)
  ) {
    return null;
  }

  // "Take the greater round figure" — a fractional weight always costs as
  // if it were the next whole unit up (4.5g -> 5g, 6.5ct -> 7ct).
  const roundedGrams = Math.ceil(metalWeightGrams);
  const roundedCarats = Math.ceil(diamondCaratWeight || 0);
  const diamondCost = roundedCarats * (settings.diamondRatePerCaratInr || 0);

  const finalUsdPrice = (purityPct) => {
    const goldCost = settings.goldRate24ktInr * roundedGrams * (purityPct / 100);
    const subtotal = goldCost + diamondCost;
    const withCharges = subtotal / (1 - settings.makingChargesPct / 100);
    const withShipping = withCharges + (settings.shippingFlatInr || 0);
    const roundedInr = ceilToNearest(withShipping, settings.roundToNearestInr);
    const priceA = roundedInr * (1 + (settings.profitMarginPct || 0) / 100);
    const priceB = roundedInr + (settings.profitMarginFlatInr || 0);
    const usdA = ceilToNearest(priceA / settings.usdInrRate, settings.roundToNearestUsd);
    const usdB = ceilToNearest(priceB / settings.usdInrRate, settings.roundToNearestUsd);
    return Math.max(usdA, usdB);
  };

  const purity = settings.karatPurityPct || {};
  const price10 = finalUsdPrice(purity['10KT']);
  const price14 = finalUsdPrice(purity['14KT']);
  const price18 = finalUsdPrice(purity['18KT']);

  return {
    price: price14,
    kt18Delta: Math.max(0, price18 - price14),
    // 10KT is lower purity than the 14KT base, so this is expected to be
    // negative — unlike kt18Delta it is not clamped to zero.
    kt10Delta: price10 - price14,
  };
}

module.exports = { ceilToNearest, computeProductPricing };
