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

// Matches a fancy diamond entry against the admin's rate table by
// shape+color, trimmed/case-insensitively (so "baguette" vs "Baguette"
// can't silently miss). Throws — a distinct failure from "settings not
// configured yet" — since a missing rate is a data problem the admin needs
// to fix, not something safe to silently price at 0.
function findFancyDiamondRate(fancyDiamondRates, shape, color) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const match = (fancyDiamondRates || []).find(
    (r) => norm(r.shape) === norm(shape) && norm(r.color) === norm(color)
  );
  if (!match) {
    throw new Error(
      `No fancy diamond rate configured for '${shape}' / '${color}' — add it in Admin → Pricing first`
    );
  }
  return match.ratePerCaratInr;
}

// { price, kt14Delta, kt18Delta } at the karat-purity table in `settings` —
// 10KT is the base (lowest purity = cheapest), so both deltas are always
// >= 0 by construction and an admin can never need to type a negative
// number. Returns null when settings aren't configured yet (caller must
// leave the product's existing price untouched in that case). Throws if a
// fancyDiamonds entry has no matching rate (see findFancyDiamondRate).
function computeProductPricing(settings, { metalWeightGrams, diamondCaratWeight, fancyDiamonds }) {
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
  // if it were the next whole unit up (4.5g -> 5g, 6.5ct -> 7ct). Applied
  // per fancy diamond too, each priced at its own shape+color rate.
  const roundedGrams = Math.ceil(metalWeightGrams);
  const roundedCarats = Math.ceil(diamondCaratWeight || 0);
  const fancyDiamondCost = (fancyDiamonds || []).reduce((sum, fd) => {
    const rate = findFancyDiamondRate(settings.fancyDiamondRates, fd.shape, fd.color);
    return sum + Math.ceil(fd.caratWeight) * rate;
  }, 0);
  const diamondCost = roundedCarats * (settings.diamondRatePerCaratInr || 0) + fancyDiamondCost;

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
    price: price10,
    kt14Delta: Math.max(0, price14 - price10),
    kt18Delta: Math.max(0, price18 - price10),
  };
}

module.exports = { ceilToNearest, computeProductPricing };
