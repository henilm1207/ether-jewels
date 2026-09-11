const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    location: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    text: { type: String, default: '' },
    verifiedPurchase: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, status: 1 });

// Recalc denormalized rating on Product
reviewSchema.statics.recalcProduct = async function (productId) {
  const Product = mongoose.model('Product');
  const agg = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await Product.findByIdAndUpdate(productId, { ratingAvg: avg, ratingCount: count });
};

module.exports = mongoose.model('Review', reviewSchema);
