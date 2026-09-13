const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'home' },
    fullName: String,
    phone: String,
    line1: String,
    city: String,
    country: String,
    zip: String,
  },
  { _id: false }
);

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
