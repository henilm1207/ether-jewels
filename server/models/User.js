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
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
    },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    addresses: { type: [addressSchema], default: [] },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
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
