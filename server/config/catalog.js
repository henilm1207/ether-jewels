/**
 * Shared jewelry catalog constants.
 * Single source of truth for categories, shapes, and v1 rules.
 *
 * v1: USD-only, ring sizes required only for ring categories.
 * v2 (planned): rework bracelets/necklaces + new `hiphop` category.
 * To add a category in v2: insert into Category collection only —
 * no Product schema change needed (category is a String + ref check in routes).
 */

const RING_CATEGORIES = [
  'rings',
  'solitaire-rings',
  'halo-rings',
  'engagement-rings',
  'three-stone-rings',
  'bands',
];

const PRODUCT_CATEGORIES_V1 = [
  'solitaire-rings',
  'halo-rings',
  'engagement-rings',
  'three-stone-rings',
  'bands',
  'earrings',
  'bracelets',
  'necklaces',
];

// Reserved for v2 — do not seed yet, but schema already supports them.
const PRODUCT_CATEGORIES_V2_RESERVED = ['hiphop'];

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
];

const METAL_COLORS = ['Rose Gold', 'White Gold', 'Yellow Gold', 'Platinum'];

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
  PRODUCT_CATEGORIES_V1,
  PRODUCT_CATEGORIES_V2_RESERVED,
  DIAMOND_SHAPES,
  METAL_COLORS,
  DEFAULT_RING_SIZES,
  isRingCategory,
};
