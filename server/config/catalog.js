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

// Diamond color grades, best (D, colorless) to N (lightly tinted).
// Stored per product as diamondColors[] (multi-select, like shapes[]).
const DIAMOND_COLORS = [
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
];

// Diamond clarity grades, best (IF) to worst (I3).
// Stored per product as clarity[] (multi-select, like shapes[]).
const DIAMOND_CLARITY = [
  'IF',
  'VVS1',
  'VVS2',
  'VS1',
  'VS2',
  'SI1',
  'SI2',
  'I1',
  'I2',
  'I3',
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
  DIAMOND_COLORS,
  DIAMOND_CLARITY,
  DEFAULT_RING_SIZES,
  isRingCategory,
};
