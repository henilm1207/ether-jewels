/**
 * Shared jewelry catalog constants.
 *
 * USD-only; ring sizes required only for ring categories.
 * Categories themselves live in the DB (see scripts/ensure-catalog.js,
 * mirrored in client/src/data/catalog.js) — no Product schema change needed
 * for new categories (category is a String + leaf check in routes).
 */

const RING_CATEGORIES = [
  'rings',
  'solitaire-rings',
  'halo-rings',
  'engagement-rings',
  'three-stone-rings',
  'bands',
];

const DIAMOND_SHAPES = [
  'Round',
  'Princess',
  'Cushion',
  'Oval',
  'Pear',
  'Emerald',
  'Marquise',
  'Asscher',
  'Heart',
  'Radiant',
];

const DEFAULT_RING_SIZES = [
  '4',
  '4.5',
  '5',
  '5.5',
  '6',
  '6.5',
  '7',
  '7.5',
  '8',
  '8.5',
  '9',
];

function isRingCategory(category) {
  if (typeof category !== 'string') return false;
  return RING_CATEGORIES.includes(category.trim().toLowerCase());
}

module.exports = {
  RING_CATEGORIES,
  DIAMOND_SHAPES,
  DEFAULT_RING_SIZES,
  isRingCategory,
};
