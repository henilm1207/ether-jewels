const mongoose = require('mongoose');

// One-time checkout codes. Plaintext codes are NEVER stored — only a
// peppered sha256 hash. Expired docs vanish via TTL; attempts cap at 5.
const otpSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email'], required: true },
    target: { type: String, required: true, trim: true, maxlength: 100 }, // normalized email / digits
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    consumed: { type: Boolean, default: false },
    purpose: { type: String, default: 'checkout' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ channel: 1, target: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
