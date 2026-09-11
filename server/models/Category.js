const mongoose = require('mongoose');

/**
 * Category collection — source of truth for collections.
 * v1 seeds 8 product categories + `rings` aggregate + shape collections.
 * v2: insert `hiphop` / reworked bracelets/necklaces here only.
 * Product.category stays a String key so new categories need no migration.
 */
const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    parent: { type: String, default: 'Collection' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    // For "Shop By Shape" collections
    shape: { type: String, default: null },
    // For aggregate collections like `rings`
    aggregateKeys: { type: [String], default: [] },
    // Alias slugs e.g. halo-rings-1 -> halo-rings
    aliasOf: { type: String, default: null },
    // Jewelry rules per category (future-proof for hiphop chain lengths etc.)
    requiresSize: { type: Boolean, default: false },
    requiresLength: { type: Boolean, default: false },
    attributes: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ shape: 1 });

module.exports = mongoose.model('Category', categorySchema);
