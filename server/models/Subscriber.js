const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
  },
  subscribedAt: { type: Date, default: Date.now },
  source: {
    type: String,
    enum: ['popup', 'footer', 'checkout'],
    default: 'footer',
  },
  active: { type: Boolean, default: true },
  unsubscribedAt: { type: Date, default: null },
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
