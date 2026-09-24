const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Saved addresses (editable). Orders keep their own frozen copy in
// Order.shippingAddress — editing here never rewrites a placed order.
// Field limits/validation: lib/address.js (normalizeAddress).
const addressSchema = new mongoose.Schema({
  label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
  isDefault: { type: Boolean, default: false },
  fullName: { type: String, trim: true, maxlength: 100 },
  phone: { type: String, trim: true, maxlength: 30 },
  line1: { type: String, trim: true, maxlength: 200 },
  line2: { type: String, trim: true, maxlength: 200 },
  landmark: { type: String, trim: true, maxlength: 120 },
  area: { type: String, trim: true, maxlength: 100 },
  city: { type: String, trim: true, maxlength: 100 },
  state: { type: String, trim: true, maxlength: 100 },
  zip: { type: String, trim: true, maxlength: 20 },
  country: { type: String, trim: true, maxlength: 100 },
  countryCode: { type: String, trim: true, uppercase: true, maxlength: 2 },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
    },
    passwordHash: { type: String, required: true, select: false },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 30,
      match: [/^[+]?[0-9\s\-()]{7,20}$/, 'Invalid mobile number'],
    },
    addresses: { type: [addressSchema], default: [] },
    // Optional personal details — birthday/anniversary offers, sizing.
    dob: { type: Date, default: null },
    anniversary: { type: Date, default: null },
    gender: { type: String, enum: ['', 'female', 'male', 'other'], default: '' },
    ringSize: { type: String, trim: true, maxlength: 10, default: '' },
    preferredMetal: { type: String, trim: true, maxlength: 30, default: '' },
    marketing: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
    },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    // Session rotation: bumped on password change / logout-all; every JWT
    // carries the version it was minted with and older ones stop working.
    tokenVersion: { type: Number, default: 0 },
    // Bag + wishlist live in their own collections (models/Bag.js,
    // models/Wishlist.js) — one doc per user. Pre-rewrite embedded data is
    // moved by scripts/migrate-bag-wishlist.js (backup + rollback included).
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

module.exports = mongoose.model('User', userSchema);
