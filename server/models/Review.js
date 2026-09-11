const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    location: { type: String, trim: true, maxlength: 100 },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be an integer 1-5' },
    },
    title: { type: String, trim: true, maxlength: 200 },
    text: { type: String, default: '', minlength: 3, maxlength: 5000 },
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
reviewSchema.index({ product: 1, user: 1 }, { unique: true, sparse: true });

// Recalc denormalized rating on Product
reviewSchema.statics.recalcProduct = async function (productId) {
  if (!mongoose.Types.ObjectId.isValid(productId)) return;
  const Product = mongoose.model('Product');
  const agg = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  const rounded = Math.round(avg * 10) / 10;
  await Product.findByIdAndUpdate(productId, { ratingAvg: rounded, ratingCount: count });
};

module.exports = mongoose.model('Review', reviewSchema);
