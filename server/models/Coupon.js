const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: { type: String, enum: ['pct', 'flat'], required: true },
    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (v) {
          if (this.type === 'pct') return v >= 1 && v <= 90;
          return v > 0;
        },
        message: 'pct value must be 1-90, flat must be > 0',
      },
    },
    minOrder: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    // True only when the OFF state was set automatically by exhaustion.
    // Lets releaseCoupon() tell "auto-off" (may reactivate) apart from an
    // owner/admin manual off (must stay off). Reset whenever the admin
    // explicitly sets `active` via PATCH.
    autoOff: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

couponSchema.methods.isUsable = function (subtotal = 0) {
  if (!Number.isFinite(subtotal) || subtotal < 0)
    return { ok: false, reason: 'Invalid order total' };
  if (!this.active) return { ok: false, reason: 'Coupon is inactive' };
  if (this.expiresAt && this.expiresAt < new Date())
    return { ok: false, reason: 'Coupon expired' };
  if (this.maxUses != null && this.usedCount >= this.maxUses)
    return { ok: false, reason: 'Coupon usage limit reached' };
  if (subtotal < (this.minOrder || 0))
    return { ok: false, reason: `Minimum order $${this.minOrder} required` };
  return { ok: true };
};

couponSchema.methods.calcDiscount = function (subtotal = 0) {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const raw =
    this.type === 'pct' ? (subtotal * this.value) / 100 : this.value;
  return Math.round(Math.min(subtotal, raw) * 100) / 100;
};

module.exports = mongoose.model('Coupon', couponSchema);
