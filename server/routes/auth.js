const express = require('express');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { signToken, authRequired } = require('../middleware/auth');
const { hashCode, randomCode, codeMatches } = require('../lib/otp');
const { sendMail, isMailConfigured } = require('../lib/mail');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[0-9\s\-()]{7,20}$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();
const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Password reset: same peppered-OTP mechanics as checkout verification
// (routes/verify.js) but under its own purpose, so a checkout code for an
// email can never be replayed to reset that account's password (or vice
// versa) even though both live in the same Otp collection.
const RESET_PURPOSE = 'password_reset';
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

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

    const taken = await User.findOne({ $or: [{ email: cleanEmail }, { phone: cleanPhone }] }).select('_id');
    // Uniform message — never reveal WHICH contact is registered.
    if (taken) return sendError(res, 400, 'Email or mobile number already registered');

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
    if (e && e.code === 11000) return sendError(res, 400, 'Email or mobile number already registered');
    next(e);
  }
});

const failWindow = new Map(); // email -> { n, until } — per-account throttle (single process)
const FAIL_MAX = 5;
const FAIL_LOCK_MS = 15 * 60 * 1000;
function loginLocked(email) {
  const rec = failWindow.get(email);
  if (!rec) return false;
  // Only an EXPIRED lock clears the record — a counting record (until falsy)
  // must survive so failures can accumulate to FAIL_MAX.
  if (rec.until && rec.until > Date.now()) return true;
  if (rec.until && rec.until <= Date.now()) failWindow.delete(email);
  return false;
}
function recordLoginFail(email) {
  const rec = failWindow.get(email) || { n: 0, until: 0 };
  rec.n += 1;
  if (rec.n >= FAIL_MAX) {
    rec.until = Date.now() + FAIL_LOCK_MS;
    rec.n = 0;
  }
  failWindow.set(email, rec);
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = normEmail(email);
    if (!cleanEmail || !password)
      return sendError(res, 400, 'email, password required');
    // req.body fields can arrive as objects (e.g. NoSQL-operator injection
    // attempts like { $gt: '' }) — mongoSanitize strips the operator key but
    // leaves a non-string value behind, which would otherwise crash
    // bcrypt.compare with an unhandled 500 further down.
    if (typeof password !== 'string') return sendError(res, 401, 'Invalid credentials');
    if (!EMAIL_RE.test(cleanEmail)) return sendError(res, 401, 'Invalid credentials');
    if (loginLocked(cleanEmail)) return sendError(res, 429, 'Too many attempts — try again later');

    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user) {
      recordLoginFail(cleanEmail);
      return sendError(res, 401, 'Invalid credentials');
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      recordLoginFail(cleanEmail);
      return sendError(res, 401, 'Invalid credentials');
    }
    failWindow.delete(cleanEmail);

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authRequired, async (req, res, next) => {  try {
    const u = req.user;
    if (!u) return sendError(res, 401, 'Invalid or expired token');
    res.json(publicUser(u));
  } catch (e) {
    next(e);
  }
});

// (Wishlist lives in routes/wishlist.js backed by the Wishlist collection.)

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
        `Profile locked while an order is ${open.status}. Editing reopens after delivery.`
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
      if (taken) return sendError(res, 400, 'Email or mobile number already registered');
      user.email = email;
    }
    if (phone) {
      if (!PHONE_RE.test(phone)) return sendError(res, 400, 'Invalid mobile number');
      const taken = await User.findOne({ phone, _id: { $ne: user._id } }).select('_id');
      if (taken) return sendError(res, 400, 'Email or mobile number already registered');
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

// PUT /api/auth/password — change password (auth). Requires the current
// password; rotates every session via tokenVersion.
router.put('/password', authRequired, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128)
      return sendError(res, 400, 'Password must be 6-128 chars');
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) return sendError(res, 401, 'Invalid or expired token');
    const ok = await user.comparePassword(String(currentPassword || ''));
    if (!ok) return sendError(res, 401, 'Current password incorrect');
    user.passwordHash = await User.hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    const fresh = await User.findById(user._id);
    res.json({ token: signToken(fresh), user: publicUser(fresh) });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/logout-all — kill every session for this account (auth).
router.post('/logout-all', authRequired, async (req, res, next) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    res.json({ message: 'All sessions signed out' });
  } catch (e) {
    next(e);
  }
});

// Per-email cooldown so a spammer can't mail-bomb someone else's inbox by
// hammering this endpoint — independent of the shared strictLimiter (which
// only caps per-IP, not per-target).
const resetCooldown = new Map(); // email -> unix ms of next allowed request
const RESET_COOLDOWN_MS = 60 * 1000;

// POST /api/auth/forgot-password — {email} → emails a reset code if the
// account exists. Always 200 with the same generic message either way, so
// this endpoint can never be used to probe which emails are registered.
router.post('/forgot-password', async (req, res, next) => {
  try {
    const cleanEmail = normEmail(req.body && req.body.email);
    const generic = { message: 'If that email is registered, a reset code was sent.' };
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) return res.json(generic);
    // Checked before the user lookup, and independent of it: this is a
    // service-availability fact, not an account fact, so it must respond
    // identically whether or not cleanEmail is registered.
    if (!isMailConfigured()) return sendError(res, 503, 'Email is not configured yet — contact support.');

    const nextAllowed = resetCooldown.get(cleanEmail) || 0;
    if (Date.now() < nextAllowed) return res.json(generic);

    const user = await User.findOne({ email: cleanEmail }).select('_id');
    if (!user) return res.json(generic);

    const code = randomCode();
    await Otp.deleteMany({ channel: 'email', target: cleanEmail, purpose: RESET_PURPOSE, consumed: false });
    await Otp.create({
      channel: 'email',
      target: cleanEmail,
      purpose: RESET_PURPOSE,
      codeHash: hashCode(code, 'email', cleanEmail, RESET_PURPOSE),
      expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
    });
    resetCooldown.set(cleanEmail, Date.now() + RESET_COOLDOWN_MS);

    // Never let a send failure (bad upstream, rate limit, provider outage)
    // produce a response different from the generic one below — that would
    // leak account existence just as surely as a direct lookup would.
    try {
      await sendMail({
        to: cleanEmail,
        subject: `Your EtherStar password reset code: ${code}`,
        html: `<div style="font-family:Arial,sans-serif;color:#222;"><h2>ETHERSTAR JEWELS</h2><p>Use this code to reset your password:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold;">${code}</p><p style="color:#666;">Valid for 10 minutes. If you didn't request this, ignore this email — your password stays unchanged.</p></div>`,
      });
    } catch (e) {
      console.error(`forgot-password mail failed for ${cleanEmail}:`, e.message);
    }
    res.json(generic);
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/reset-password — {email, code, newPassword} → sets a new
// password and invalidates every existing session (tokenVersion bump),
// same as the authenticated change-password route above.
router.post('/reset-password', async (req, res, next) => {
  try {
    const cleanEmail = normEmail(req.body && req.body.email);
    const code = String((req.body && req.body.code) || '').trim();
    const newPassword = req.body && req.body.newPassword;
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail) || !code)
      return sendError(res, 400, 'Email and code are required');
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128)
      return sendError(res, 400, 'Password must be 6-128 chars');

    const doc = await Otp.findOne({
      channel: 'email',
      target: cleanEmail,
      purpose: RESET_PURPOSE,
      consumed: false,
    }).sort({ createdAt: -1 });
    if (!doc || doc.expiresAt.getTime() < Date.now()) {
      if (doc) await doc.deleteOne();
      return sendError(res, 400, 'Invalid or expired code');
    }
    if (doc.attempts >= RESET_MAX_ATTEMPTS) {
      await doc.deleteOne();
      return sendError(res, 429, 'Too many attempts — request a new code');
    }
    const guess = hashCode(code, 'email', cleanEmail, RESET_PURPOSE);
    if (!codeMatches(guess, doc.codeHash)) {
      doc.attempts += 1;
      await doc.save();
      if (doc.attempts >= RESET_MAX_ATTEMPTS) await doc.deleteOne();
      return sendError(res, 400, 'Invalid or expired code');
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      await doc.deleteOne();
      return sendError(res, 400, 'Invalid or expired code');
    }
    user.passwordHash = await User.hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await doc.deleteOne();
    res.json({ message: 'Password reset — please log in with your new password.' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
