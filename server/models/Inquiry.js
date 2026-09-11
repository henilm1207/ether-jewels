const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['contact', 'custom-design', 'diamond-help'],
      default: 'contact',
    },
    name: String,
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    message: { type: String, required: true },
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
