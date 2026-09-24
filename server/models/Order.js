const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: String, // styleCode snapshot
    name: String, // name snapshot
    image: String, // first image snapshot
    category: String, // category snapshot (for ring-size validation)
    metal: {
      karat: { type: String, enum: ['10KT', '14KT', '18KT'], default: '10KT' },
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
    // Coupon lifecycle: consumed only when the order is PAID, released on
    // fail/cancel/expiry. Guards double-consume across webhook+confirm.
    couponConsumed: { type: Boolean, default: false },
    // Shipment tracking — set by admin, visible to the customer on /account.
    trackingId: { type: String, trim: true, maxlength: 100, default: null },
    carrier: { type: String, trim: true, maxlength: 100, default: null },
    // Unpaid auto-expiry (set at creation while payment pending; cleared on pay).
    expiresAt: { type: Date, default: null },
    // Client checkout-attempt key: replays reuse the pending order, never mint.
    idempotencyKey: { type: String, trim: true, maxlength: 100, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'making', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    payment: {
      method: { type: String, enum: ['card', 'cod', 'razorpay', 'skydo'], default: 'card' },
      status: {
        type: String,
        // awaiting_transfer: SkyDo bank-wire orders — customer has the wire
        // instructions but funds haven't landed yet (see routes/payments/skydo.js).
        enum: ['pending', 'paid', 'failed', 'refunded', 'awaiting_transfer'],
        default: 'pending',
      },
      txnId: { type: String, trim: true, maxlength: 100 },
      // Razorpay: the amount actually charged (INR), converted from the
      // canonical USD pricing.total at checkout time — audit trail only.
      chargedAmount: { type: Number, min: 0 },
      chargedCurrency: { type: String, trim: true, maxlength: 10 },
      // SkyDo: which virtual account currency the customer was shown to wire from.
      wireCurrency: { type: String, enum: ['USD', 'GBP', 'EUR'] },
      wireReference: { type: String, trim: true, maxlength: 40 },
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
