const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: String,
  price: Number,
  color: String,
  material: String,
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    compareAtPrice: Number,
    description: String,
    shortDescription: String,
    category: {
      type: String,
      required: true,
      enum: [
        'solitaire-rings',
        'halo-rings',
        'engagement-rings',
        'three-stone-rings',
        'bands',
        'earrings',
        'bracelets',
        'necklaces',
      ],
    },
    images: [String],
    variants: [variantSchema],
    tags: [String],
    badge: {
      type: String,
      enum: ['new', 'sale', 'hot', null],
      default: null,
    },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
