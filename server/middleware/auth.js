const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getSecret() {
  return process.env.JWT_SECRET;
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, getSecret());
    const user = await User.findById(payload.id);
    if (user) req.user = user;
  } catch (e) {
    if (e && (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError')) {
      return next(); // treat as guest
    }
    return next(e); // DB errors must surface, not silently become guest
  }
  next();
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Auth token required' });
  try {
    const payload = jwt.verify(token, getSecret());
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  } catch (e) {
    if (e && (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError')) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    return next(e);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin only' });
  next();
}

module.exports = { signToken, authOptional, authRequired, requireAdmin };
