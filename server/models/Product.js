const mongoose = require('mongoose');
const { DIAMOND_SHAPES, isRingCategory } = require('../config/catalog');

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    material: { type: String, trim: true },
    color: { type: String, default: '' }, // hex swatch e.g. #E0BFB8
    price: { type: Number, required: true, min: 0 }, // 14KT price for this metal
    inStock: { type: Boolean, default: true },
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
    shape: { type: String, enum: [...DIAMOND_SHAPES, null], default: null },
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
productSchema.pre('validate', function (next) {
  if (this.variants && this.variants.length) {
    for (const v of this.variants) {
      if (!v.material && v.name) v.material = v.name;
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
productSchema.index({ price: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ legacySlugs: 1 });
productSchema.index(
  { name: 'text', description: 'text', styleCode: 'text' },
  { name: 'ProductText' }
);

module.exports = mongoose.model('Product', productSchema);
