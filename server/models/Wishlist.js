const mongoose = require('mongoose');

// Amazon/Myntra-style favourites — one document per user, order-preserving
// (unshift newest first). Guests use localStorage; on login guest ids merge
// in (union, no duplicates). Bag <-> wishlist moves are handled by the
// bag/wishlist routes acting on both collections.
const wishlistItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
