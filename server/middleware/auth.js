const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getSecret() {
  return process.env.JWT_SECRET;
}

// Parse '30s/15m/2h/1d' (or seconds) and cap at 7 days — sessions for a
// high-value store must never live for weeks on one stolen token.
function cappedExpiry() {
  const raw = String(process.env.JWT_EXPIRES_IN || '1d').trim();
  const m = raw.match(/^(\d+)\s*([smhd])$/i);
  let secs;
  if (m) {
    const n = parseInt(m[1], 10);
    const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2].toLowerCase()];
    secs = n * mult;
  } else if (/^\d+$/.test(raw)) {
    secs = parseInt(raw, 10);
  } else {
    secs = 86400;
  }
  return Math.min(Math.max(secs, 60), 7 * 86400);
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, v: user.tokenVersion || 0 },
    getSecret(),
    { expiresIn: cappedExpiry() }
  );
}

function tokenAlive(payload, user) {
  if (!user) return false;
  if ((payload.v || 0) !== (user.tokenVersion || 0)) return false; // rotated — dead
  return true;
}

async function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, getSecret());
    const user = await User.findById(payload.id);
    // A presented-but-dead token (expired/invalid/rotated) must FAIL here,
    // never silently downgrade to guest — otherwise orders/payments lose
    // their owner link and PII gates below can't tell friend from stranger.
    if (!user || !tokenAlive(payload, user)) {
      const err = new Error('Invalid or expired token');
      err.status = 401;
      return next(err);
    }
    req.user = user;
  } catch (e) {
    if (e && (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError')) {
      const err = new Error('Invalid or expired token');
      err.status = 401;
      return next(err);
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
    if (!tokenAlive(payload, user)) return res.status(401).json({ message: 'Invalid or expired token' });
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
