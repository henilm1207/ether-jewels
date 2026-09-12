// Checkout contact verification: 6-digit OTP over email (Resend, free) or
// WhatsApp (Meta template, pennies). Both channels must verify before any
// order/payment route accepts the checkout — enforced via a short-lived
// token bound to the exact email+phone pair.
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const VerifiedContact = require('../models/VerifiedContact');
const { sendMail, isMailConfigured } = require('../lib/mail');
const { sendWhatsAppOtp } = require('../lib/whatsapp');

const router = express.Router();
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const normEmail = (v) => String(v || '').trim().toLowerCase();
const normPhone = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  return digits;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashCode(code, channel, target) {
  const pepper = process.env.JWT_SECRET || '';
  return crypto.createHash('sha256').update(`${code}|${channel}|${target}|${pepper}`).digest('hex');
}

function randomCode() {
  return String(crypto.randomInt(100000, 1000000));
}

// POST /api/verify/request — {channel:'email'|'whatsapp', value} → sends code.
// Generic 200 either way (no account probing); 503 when provider unset.
router.post('/request', async (req, res, next) => {
  try {
    const { channel, value } = req.body || {};
    if (channel !== 'email' && channel !== 'whatsapp')
      return res.status(400).json({ message: 'channel must be email or whatsapp' });
    const target = channel === 'email' ? normEmail(value) : normPhone(value);
    if (channel === 'email' && !EMAIL_RE.test(target))
      return res.status(400).json({ message: 'Valid email required' });
    if (channel === 'whatsapp' && !/^[1-9]\d{6,14}$/.test(target))
      return res.status(400).json({ message: 'Valid phone with country code required' });

    const code = randomCode();
    // Honest gating: never pretend a code was sent when no provider exists.
    if (channel === 'email' && !isMailConfigured())
      return res.status(503).json({ message: 'Email OTP not configured yet' });
    await Otp.deleteMany({ channel, target, consumed: false });
    await Otp.create({
      channel,
      target,
      codeHash: hashCode(code, channel, target),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    try {
      if (channel === 'email') {
        await sendMail({
          to: target,
          subject: `Your EtherStar verification code: ${code}`,
          html: `<div style="font-family:Arial,sans-serif;color:#222;"><h2>ETHERSTAR JEWELS</h2><p>Your verification code:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold;">${code}</p><p style="color:#666;">Valid for 10 minutes. Never share this code.</p></div>`,
        });
      } else {
        await sendWhatsAppOtp(target, code);
      }
    } catch (e) {
      if (e && e.status === 503) return res.status(503).json({ message: e.message });
      throw e;
    }
    res.json({ message: 'If valid, a code was sent', channel, expiresIn: 600 });
  } catch (e) {
    next(e);
  }
});

// POST /api/verify/check — {channel, value, code} → marks contact verified.
router.post('/check', async (req, res, next) => {
  try {
    const { channel, value, code } = req.body || {};
    if (channel !== 'email' && channel !== 'whatsapp')
      return res.status(400).json({ message: 'channel must be email or whatsapp' });
    const target = channel === 'email' ? normEmail(value) : normPhone(value);
    const doc = await Otp.findOne({ channel, target, consumed: false }).sort({ createdAt: -1 });
    if (!doc || doc.expiresAt.getTime() < Date.now()) {
      if (doc) await doc.deleteOne();
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    if (doc.attempts >= MAX_ATTEMPTS) {
      await doc.deleteOne();
      return res.status(429).json({ message: 'Too many attempts — request a new code' });
    }
    const guess = hashCode(String(code || '').trim(), channel, target);
    const a = Buffer.from(guess, 'hex');
    const b = Buffer.from(doc.codeHash, 'hex');
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!match) {
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
// when both contacts verified within the TTL window.
router.post('/token', async (req, res, next) => {
  try {
    const email = normEmail(req.body && req.body.email);
    const phone = normPhone(req.body && req.body.phone);
    if (!EMAIL_RE.test(email) || !/^[1-9]\d{6,14}$/.test(phone))
      return res.status(400).json({ message: 'Verified email and phone required' });
    const [em, ph] = await Promise.all([
      VerifiedContact.findOne({ channel: 'email', value: email }).select('_id'),
      VerifiedContact.findOne({ channel: 'whatsapp', value: phone }).select('_id'),
    ]);
    if (!em || !ph)
      return res.status(400).json({ message: 'Verify email and phone with OTP first' });
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
  if (!token) throw Object.assign(new Error('Verify email and phone with OTP first'), { status: 400 });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw Object.assign(new Error('Verification expired — please re-verify'), { status: 400 });
  }
  if (!payload || payload.purpose !== 'checkout' || !payload.email || !payload.phone)
    throw Object.assign(new Error('Verify email and phone with OTP first'), { status: 400 });
  const emailOk = normEmail(contactEmail) === payload.email;
  const phoneOk = normPhone(phone) === payload.phone;
  if (!emailOk || !phoneOk)
    throw Object.assign(new Error('Verification does not match this order’s contact details'), { status: 400 });
  return payload;
}

module.exports = router;
module.exports.requireVerifiedCheckout = requireVerifiedCheckout;
