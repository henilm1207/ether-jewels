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

const cartLineSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Chosen metal snapshot (display + checkout metal match; price revalidated at checkout).
    variant: {
      name: { type: String, trim: true, maxlength: 100 },
      material: { type: String, trim: true, maxlength: 100 },
      kt: { type: String, trim: true, maxlength: 10 },
      price: { type: Number, min: 0 },
      image: { type: String, trim: true, maxlength: 500 },
    },
    size: { type: String, trim: true, maxlength: 10 },
    qty: { type: Number, default: 1, min: 1, max: 99 },
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
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // Account cart — follows login across devices; guests use localStorage.
    cart: { type: [cartLineSchema], default: [] },
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
