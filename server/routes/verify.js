// Checkout contact verification: 6-digit OTP over email (Resend free tier).
// Enforced via a short-lived token bound to the exact email+phone pair —
// the phone isn't OTP-verified (SMS/WhatsApp OTP cost per message) but is
// still pinned so the order's contact details can't be swapped afterwards.
const express = require('express');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const VerifiedContact = require('../models/VerifiedContact');
const { sendMail, isMailConfigured } = require('../lib/mail');
const { hashCode, randomCode, codeMatches } = require('../lib/otp');

const router = express.Router();
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PURPOSE = 'checkout';

const normEmail = (v) => String(v || '').trim().toLowerCase();
const normPhone = (v) => String(v || '').replace(/\D/g, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/verify/request — {channel:'email', value} → sends code.
// Generic 200 either way (no account probing); 503 when provider unset.
router.post('/request', async (req, res, next) => {
  try {
    const { channel, value } = req.body || {};
    if (channel !== 'email') return res.status(400).json({ message: 'channel must be email' });
    const target = normEmail(value);
    if (!EMAIL_RE.test(target)) return res.status(400).json({ message: 'Valid email required' });

    const code = randomCode();
    // Honest gating: never pretend a code was sent when no provider exists.
    if (!isMailConfigured())
      return res.status(503).json({ message: 'Email OTP not configured yet' });
    await Otp.deleteMany({ channel, target, purpose: PURPOSE, consumed: false });
    await Otp.create({
      channel,
      target,
      purpose: PURPOSE,
      codeHash: hashCode(code, channel, target, PURPOSE),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    await sendMail({
      to: target,
      subject: `Your EtherStar verification code: ${code}`,
      html: `<div style="font-family:Arial,sans-serif;color:#222;"><h2>ETHERSTAR JEWELS</h2><p>Your verification code:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold;">${code}</p><p style="color:#666;">Valid for 10 minutes. Never share this code.</p></div>`,
    });
    res.json({ message: 'If valid, a code was sent', channel, expiresIn: 600 });
  } catch (e) {
    next(e);
  }
});

// POST /api/verify/check — {channel, value, code} → marks contact verified.
router.post('/check', async (req, res, next) => {
  try {
    const { channel, value, code } = req.body || {};
    if (channel !== 'email') return res.status(400).json({ message: 'channel must be email' });
    const target = normEmail(value);
    const doc = await Otp.findOne({ channel, target, purpose: PURPOSE, consumed: false }).sort({ createdAt: -1 });
    if (!doc || doc.expiresAt.getTime() < Date.now()) {
      if (doc) await doc.deleteOne();
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    if (doc.attempts >= MAX_ATTEMPTS) {
      await doc.deleteOne();
      return res.status(429).json({ message: 'Too many attempts — request a new code' });
    }
    const guess = hashCode(String(code || '').trim(), channel, target, PURPOSE);
    if (!codeMatches(guess, doc.codeHash)) {
      doc.attempts += 1;
      await doc.save();
      if (doc.attempts >= MAX_ATTEMPTS) await doc.deleteOne();
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    doc.consumed = true;
    await doc.save();
    await VerifiedContact.findOneAndUpdate(
      { channel, value: target },
      { channel, value: target, verifiedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ verified: true, channel });
  } catch (e) {
    next(e);
  }
});

// POST /api/verify/token — {email, phone} → 60-min checkout token, but ONLY
// when the email verified within the TTL window. The phone is bound into
// the token so the gate below keeps matching the exact pair.
router.post('/token', async (req, res, next) => {
  try {
    const email = normEmail(req.body && req.body.email);
    const phone = normPhone(req.body && req.body.phone);
    if (!EMAIL_RE.test(email) || !/^[1-9]\d{6,14}$/.test(phone))
      return res.status(400).json({ message: 'Verified email and phone required' });
    const em = await VerifiedContact.findOne({ channel: 'email', value: email }).select('_id');
    if (!em) return res.status(400).json({ message: 'Verify email with OTP first' });
    const token = jwt.sign({ purpose: 'checkout', email, phone }, process.env.JWT_SECRET, {
      expiresIn: '60m',
    });
    res.json({ verificationToken: token });
  } catch (e) {
    next(e);
  }
});

// Gate used by order/payment creation: token must be valid AND bound to the
// exact contact pair on the order. Throws {status,message} on failure.
function requireVerifiedCheckout(req, contactEmail, phone) {
  const token = req.headers['x-verification-token'];
  if (!token) throw Object.assign(new Error('Verify your email with OTP first'), { status: 400 });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw Object.assign(new Error('Verification expired — please re-verify'), { status: 400 });
  }
  if (!payload || payload.purpose !== 'checkout' || !payload.email || !payload.phone)
    throw Object.assign(new Error('Verify your email with OTP first'), { status: 400 });
  const emailOk = normEmail(contactEmail) === payload.email;
  const phoneOk = normPhone(phone) === payload.phone;
  if (!emailOk || !phoneOk)
    throw Object.assign(new Error('Verification does not match this order’s contact details'), { status: 400 });
  return payload;
}

module.exports = router;
module.exports.requireVerifiedCheckout = requireVerifiedCheckout;
