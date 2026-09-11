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
  };
}

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

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const u = req.user;
    if (!u) return sendError(res, 401, 'Invalid or expired token');
    res.json({
      ...publicUser(u),
      wishlist: Array.isArray(u.wishlist) ? u.wishlist : [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
