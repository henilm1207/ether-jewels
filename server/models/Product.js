const mongoose = require('mongoose');
const { DIAMOND_SHAPES, DIAMOND_COLORS, DIAMOND_CLARITY, isRingCategory } = require('../config/catalog');

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    material: { type: String, trim: true },
    color: { type: String, default: '' }, // hex swatch e.g. #E0BFB8
    price: { type: Number, required: true, min: 0 }, // 14KT price for this metal
    inStock: { type: Boolean, default: true },
    // Optional metal-specific photo (URL from the product's images[]).
    // PDP jumps the gallery to it when the swatch is selected; empty =
    // fall back to the cover image (pre-change products unaffected).
    image: { type: String, default: '' },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    legacySlugs: { type: [String], default: [] },
    // Frontend `style: 'MJ72R'` -> stored as styleCode (SKU)
    styleCode: { type: String, unique: true, sparse: true, trim: true },
    shape: { type: String, enum: [...DIAMOND_SHAPES, null], default: null }, // primary (first of shapes)
    // All applicable shapes, max 5. First entry should equal `shape`.
    // Empty allowed (e.g. plain bands). Filters match ANY entry (OR).
    shapes: {
      type: [String],
      default: [],
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length <= 5 &&
          v.every((s) => DIAMOND_SHAPES.includes(s)),
        message: 'shapes must list at most 5 valid diamond shapes',
      },
    },
    // Diamond color grades (multi-select, like shapes). Empty allowed
    // (e.g. plain bands or legacy products) — UI hides empty values.
    diamondColors: {
      type: [String],
      default: [],
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length <= DIAMOND_COLORS.length &&
          v.every((c) => DIAMOND_COLORS.includes(c)),
        message: 'diamondColors must list valid diamond color grades (D-N)',
      },
    },
    // Diamond clarity grades (multi-select, like shapes). Empty allowed.
    clarity: {
      type: [String],
      default: [],
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length <= DIAMOND_CLARITY.length &&
          v.every((c) => DIAMOND_CLARITY.includes(c)),
        message: 'clarity must list valid diamond clarity grades (IF-I3)',
      },
    },
    // 14KT base price. 18KT = base + kt18Delta (see PDP logic).
    price: { type: Number, required: true, min: 0 },
    kt18Delta: { type: Number, default: 200, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    // USD-only v1 per client decision
    currency: { type: String, enum: ['USD'], default: 'USD', required: true },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    // String key into Category.key (not strict enum so new categories need no migration)
    category: { type: String, required: true, trim: true },
    images: {
      type: [String],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    video: { type: String, default: null },
    variants: { type: [variantSchema], default: [], validate: (v) => Array.isArray(v) && v.length >= 1 },
    tags: { type: [String], default: [] },
    badge: { type: String, enum: ['new', 'sale', 'hot', null], default: null },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
    },
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
    // Ring sizes (US). Required ONLY for ring categories, forbidden otherwise.
    sizes: { type: [String], default: [] },
    defaultSize: { type: String, default: null },
    details: {
      sideStoneCertified: { type: Boolean, default: false },
      deliveryDays: { type: Number, default: 30, min: 0 },
      metalWeightGrams: { type: Number, min: 0 },
      makingCharges: { type: Number, min: 0 },
    },
    // Denormalized from reviews
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    seoTitle: String,
    seoDesc: String,
  },
  { timestamps: true }
);

// Validate metal color names loosely (allow future Platinum without breaking)
const { DEFAULT_RING_SIZES } = require('../config/catalog');

// Media URLs must be plain https? links — no javascript:/data: payloads,
// no tracking-pixel tricks. Admin-pasted URLs render straight into <img>.
const MEDIA_URL_RE = /^https?:\/\/[^\s"'<>\\^`{|}]+$/i;
const isMediaUrl = (u) => typeof u === 'string' && u.length <= 1000 && MEDIA_URL_RE.test(u);
productSchema.pre('validate', function (next) {
  if (this.variants && this.variants.length) {
    for (const v of this.variants) {
      if (!v.material && v.name) v.material = v.name;
    }
  }

  // Price invariants — a typo must never create a $1 ring or fake markdown.
  if (this.compareAtPrice != null && !(this.compareAtPrice > this.price)) {
    return next(new Error('compareAtPrice must be above price'));
  }
  for (const v of this.variants || []) {
    if (v.price != null && !(v.price > 0 && v.price <= 1000000)) {
      return next(new Error(`Invalid variant price for '${v.name || v.material || '?'}'`));
    }
  }

  // Media trust: every URL must be a plain link, and a variant photo must
  // be one of the product's own images (no external swaps at checkout).
  const imgs = Array.isArray(this.images) ? this.images : [];
  for (const u of imgs) {
    if (!isMediaUrl(u)) return next(new Error('images[] must be valid http(s) URLs'));
  }
  if (this.video != null && this.video !== '' && !isMediaUrl(this.video)) {
    return next(new Error('video must be a valid http(s) URL'));
  }
  for (const v of this.variants || []) {
    if (v.image != null && v.image !== '') {
      if (!isMediaUrl(v.image)) return next(new Error(`Invalid variant image for '${v.name || v.material || '?'}'`));
      if (!imgs.includes(v.image)) return next(new Error(`Variant image must be one of images[] ('${v.name || v.material || '?'}')`));
    }
  }

  // Ring-size rule: required for rings, empty for non-rings
  const ring = isRingCategory(this.category);
  if (ring) {
    if (!this.sizes || this.sizes.length === 0) {
      return next(
        new Error(`sizes[] is required for ring category '${this.category}'`)
      );
    }
    const bad = this.sizes.filter((s) => !DEFAULT_RING_SIZES.includes(s));
    if (bad.length) return next(new Error(`Invalid ring sizes: ${bad.join(', ')}`));
    if (this.defaultSize && !this.sizes.includes(this.defaultSize)) {
      return next(new Error('defaultSize must be one of sizes[]'));
    }
  } else {
    if (this.sizes && this.sizes.length > 0) {
      return next(
        new Error(`sizes[] must be empty for non-ring category '${this.category}'`)
      );
    }
    if (this.defaultSize) {
      return next(new Error('defaultSize must be empty for non-ring category'));
    }
  }
  next();
});

productSchema.index({ category: 1, status: 1 });
productSchema.index({ shape: 1, status: 1 });
productSchema.index({ shapes: 1, status: 1 });
productSchema.index({ diamondColors: 1, status: 1 });
productSchema.index({ clarity: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ legacySlugs: 1 });
productSchema.index(
  { name: 'text', description: 'text', styleCode: 'text' },
  { name: 'ProductText' }
);

module.exports = mongoose.model('Product', productSchema);
