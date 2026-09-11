const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body || {};
    const cleanEmail = normEmail(email);
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName || !cleanEmail || !password)
      return sendError(res, 400, 'name, email, password required');
    if (!EMAIL_RE.test(cleanEmail)) return sendError(res, 400, 'Invalid email');
    if (typeof password !== 'string' || password.length < 6 || password.length > 128)
      return sendError(res, 400, 'Password must be 6-128 chars');
    if (phone != null && (typeof phone !== 'string' || phone.length > 30))
      return sendError(res, 400, 'Invalid phone');

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return sendError(res, 400, 'Email already registered');

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: cleanName.slice(0, 100),
      email: cleanEmail,
      passwordHash,
      phone: typeof phone === 'string' ? phone.trim().slice(0, 30) : undefined,
    });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    if (e && e.code === 11000) return sendError(res, 400, 'Email already registered');
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
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const u = req.user;
    if (!u) return sendError(res, 401, 'Invalid or expired token');
    res.json({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      wishlist: Array.isArray(u.wishlist) ? u.wishlist : [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
