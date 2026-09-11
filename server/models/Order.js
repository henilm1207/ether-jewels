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
    qty: { type: Number, required: true, min: 1, max: 10 },
    unitPrice: { type: Number, required: true, min: 0, max: 1000000 },
    lineTotal: { type: Number, required: true, min: 0, max: 10000000 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0 && v.length <= 20,
        message: 'items must contain 1-20 entries',
      },
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
      method: { type: String, enum: ['card', 'cod'], default: 'card' },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      txnId: { type: String, trim: true, maxlength: 100 },
    },
    shippingAddress: {
      fullName: { type: String, required: true, trim: true, maxlength: 100 },
      line1: { type: String, required: true, trim: true, maxlength: 200 },
      city: { type: String, required: true, trim: true, maxlength: 100 },
      country: { type: String, required: true, trim: true, maxlength: 100 },
      zip: { type: String, required: true, trim: true, maxlength: 20 },
      phone: { type: String, trim: true, maxlength: 30 },
    },
    orderNote: { type: String, default: '', maxlength: 1000 },
    contact: {
      name: { type: String, trim: true, maxlength: 100 },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
      },
      phone: { type: String, trim: true, maxlength: 30 },
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
