const mongoose = require('mongoose');

// Recently-verified contacts. TTL (1h) IS the freshness rule: checkout
// tokens issue only while both entries exist, so verification is always
// recent without timestamp math scattered across routes.
const verifiedContactSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email', 'whatsapp'], required: true },
    value: { type: String, required: true, trim: true, maxlength: 100 }, // normalized
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

verifiedContactSchema.index({ channel: 1, value: 1 });
verifiedContactSchema.index({ verifiedAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('VerifiedContact', verifiedContactSchema);
