const mongoose = require('mongoose');

// Amazon/Myntra-style account bag — one document per user. `items` is the
// checkout bag; `savedForLater` is the shelf (kept server-side, excluded
// from totals and checkout). Guests use localStorage; on login the guest
// bag merges in (quantities SUM, capped). Prices are display snapshots only
// — checkout re-prices everything via lib/quote, so stored prices can't
// leak through.
const bagLineSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Chosen metal snapshot (display + checkout metal match).
    variant: {
      name: { type: String, trim: true, maxlength: 100 },
      material: { type: String, trim: true, maxlength: 100 },
      kt: { type: String, trim: true, maxlength: 10 },
      price: { type: Number, min: 0 },
      image: { type: String, trim: true, maxlength: 500 },
    },
    size: { type: String, trim: true, maxlength: 10 },
    // Per-line cap 10 matches lib/quote (qty 1..10) and the storefront stepper.
    qty: { type: Number, default: 1, min: 1, max: 10 },
  },
  { _id: false }
);

const bagSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [bagLineSchema], default: [] },
    savedForLater: { type: [bagLineSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bag', bagSchema);
module.exports.bagLineSchema = bagLineSchema;
