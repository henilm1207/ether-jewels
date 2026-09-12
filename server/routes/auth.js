const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[0-9\s\-()]{7,20}$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();
const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    wishlist: Array.isArray(user.wishlist) ? user.wishlist.map(String) : [],
  };
}

const wishlistIds = (user) =>
  (Array.isArray(user.wishlist) ? user.wishlist : []).map(String);

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body || {};
    const cleanFirst = cleanStr(firstName, 50);
    const cleanLast = cleanStr(lastName, 50);
    const cleanEmail = normEmail(email);
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    if (!cleanFirst || cleanFirst.length < 2)
      return sendError(res, 400, 'First name must be 2+ chars');
    if (!cleanLast || cleanLast.length < 2)
      return sendError(res, 400, 'Last name must be 2+ chars');
    if (!cleanEmail) return sendError(res, 400, 'Email is required');
    if (!EMAIL_RE.test(cleanEmail)) return sendError(res, 400, 'Invalid email');
    if (!cleanPhone) return sendError(res, 400, 'Mobile number is required');
    if (!PHONE_RE.test(cleanPhone)) return sendError(res, 400, 'Invalid mobile number');
    if (typeof password !== 'string' || password.length < 6 || password.length > 128)
      return sendError(res, 400, 'Password must be 6-128 chars');

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) return sendError(res, 400, 'Email already registered');
    const existingPhone = await User.findOne({ phone: cleanPhone });
    if (existingPhone) return sendError(res, 400, 'Mobile number already registered');

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      firstName: cleanFirst,
      lastName: cleanLast,
      name: `${cleanFirst} ${cleanLast}`.slice(0, 100),
      email: cleanEmail,
      passwordHash,
      phone: cleanPhone.slice(0, 30),
    });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    if (e && e.code === 11000) {
      const field = e.message.includes('phone') ? 'Mobile number' : 'Email';
      return sendError(res, 400, `${field} already registered`);
    }
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = normEmail(email);
    if (!cleanEmail || !password)
      return sendError(res, 400, 'email, password required');
    if (!EMAIL_RE.test(cleanEmail)) return sendError(res, 401, 'Invalid credentials');

    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user) return sendError(res, 401, 'Invalid credentials');
    const ok = await user.comparePassword(password);
    if (!ok) return sendError(res, 401, 'Invalid credentials');

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authRequired, async (req, res, next) => {  try {
    const u = req.user;
    if (!u) return sendError(res, 401, 'Invalid or expired token');
    res.json({
      ...publicUser(u),
      wishlist: wishlistIds(u),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/wishlist/merge — union guest picks into the account (auth).
// Body { ids: [productId...] }; capped, validated, existing+active only.
// NOTE: defined before /wishlist/:productId so "merge" isn't read as an id.
router.post('/wishlist/merge', authRequired, async (req, res, next) => {
  try {
    const raw = Array.isArray((req.body || {}).ids) ? req.body.ids : [];
    const clean = [...new Set(raw.map(String))].filter(mongoose.isValidObjectId).slice(0, 100);
    let valid = [];
    if (clean.length) {
      const Product = require('../models/Product');
      const found = await Product.find({ _id: { $in: clean }, status: 'active' }).select('_id');
      valid = found.map((p) => String(p._id));
    }
    const merged = [...new Set([...wishlistIds(req.user), ...valid])];
    req.user.wishlist = merged;
    await req.user.save();
    res.json({ wishlist: merged });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/wishlist/:productId — toggle one favorite (auth).
// Returns the updated wishlist id list.
router.post('/wishlist/:productId', authRequired, async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId))
      return sendError(res, 400, 'Invalid product');
    const Product = require('../models/Product');
    const product = await Product.findOne({ _id: productId, status: 'active' }).select('_id');
    if (!product) return sendError(res, 404, 'Product not found');
    const ids = wishlistIds(req.user);
    const nextIds = ids.includes(String(productId))
      ? ids.filter((w) => w !== String(productId))
      : [...ids, String(productId)];
    req.user.wishlist = nextIds;
    await req.user.save();
    res.json({ wishlist: nextIds });
  } catch (e) {
    next(e);
  }
});

// PUT /api/auth/profile — update name/email/phone (auth).
// High-value rule: while ANY order is unreceived (pending/confirmed/making/
// shipped), the whole profile is frozen — contact details must stay valid
// for the courier until the parcel is delivered (or the order cancelled).
router.put('/profile', authRequired, async (req, res, next) => {
  try {
    const user = req.user;
    const firstName = cleanStr(req.body && req.body.firstName, 50);
    const lastName = cleanStr(req.body && req.body.lastName, 50);
    const email = normEmail(req.body && req.body.email);
    const phone = typeof (req.body && req.body.phone) === 'string' ? req.body.phone.trim().slice(0, 30) : '';

    const changes =
      (firstName && firstName !== user.firstName) ||
      (lastName && lastName !== user.lastName) ||
      (email && email !== user.email) ||
      (phone && phone !== user.phone);
    if (!changes) return res.json(publicUser(user));

    const Order = require('../models/Order');
    const open = await Order.findOne({
      user: user._id,
      status: { $in: ['pending', 'confirmed', 'making', 'shipped'] },
    }).select('_id status');
    if (open) {
      return sendError(
        res,
        400,
        `Profile locked — order ${String(open._id).slice(-8).toUpperCase()} is ${open.status}. Editing reopens after delivery.`
      );
    }

    if (firstName) {
      if (firstName.length < 2) return sendError(res, 400, 'First name must be 2+ chars');
      user.firstName = firstName;
    }
    if (lastName) {
      if (lastName.length < 2) return sendError(res, 400, 'Last name must be 2+ chars');
      user.lastName = lastName;
    }
    if (email) {
      if (!EMAIL_RE.test(email)) return sendError(res, 400, 'Invalid email');
      const taken = await User.findOne({ email, _id: { $ne: user._id } }).select('_id');
      if (taken) return sendError(res, 400, 'Email already registered');
      user.email = email;
    }
    if (phone) {
      if (!PHONE_RE.test(phone)) return sendError(res, 400, 'Invalid mobile number');
      const taken = await User.findOne({ phone, _id: { $ne: user._id } }).select('_id');
      if (taken) return sendError(res, 400, 'Mobile number already registered');
      user.phone = phone;
    }
    user.name = `${user.firstName} ${user.lastName}`.slice(0, 100);
    await user.save();
    res.json(publicUser(user));
  } catch (e) {
    if (e && e.code === 11000) return sendError(res, 400, 'Email or mobile number already registered');
    next(e);
  }
});

module.exports = router;
