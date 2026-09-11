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
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

couponSchema.methods.isUsable = function (subtotal = 0) {
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
  if (this.type === 'pct') return Math.min(subtotal, (subtotal * this.value) / 100);
  return Math.min(subtotal, this.value);
};

module.exports = mongoose.model('Coupon', couponSchema);
