const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: String, // styleCode snapshot
    name: String, // name snapshot
    image: String, // first image snapshot
    category: String, // category snapshot (for ring-size validation)
    metal: {
      karat: { type: String, enum: ['14KT', '18KT'], default: '14KT' },
      color: String, // e.g. Rose Gold
    },
    size: { type: String, default: null }, // required for ring categories (enforced in route)
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      shipping: { type: Number, default: 0, min: 0 },
      tax: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 },
      currency: { type: String, enum: ['USD'], default: 'USD', required: true },
    },
    couponCode: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'making', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    payment: {
      method: { type: String, enum: ['cod', 'card', 'upi', 'bank'], default: 'card' },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      txnId: String,
    },
    shippingAddress: {
      fullName: String,
      line1: String,
      city: String,
      country: String,
      zip: String,
      phone: String,
    },
    orderNote: { type: String, default: '' },
    contact: {
      name: String,
      email: String,
      phone: String,
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
