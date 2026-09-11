const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['contact', 'custom-design', 'diamond-help'],
      default: 'contact',
    },
    name: { type: String, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
    },
    phone: { type: String, trim: true, maxlength: 30 },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    message: { type: String, required: true, minlength: 10, maxlength: 5000 },
    status: {
      type: String,
      enum: ['new', 'replied', 'closed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
