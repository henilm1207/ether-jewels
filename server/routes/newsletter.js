const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const Coupon = require('../models/Coupon');
const { sendWelcomeCoupon } = require('../lib/mail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = ['popup', 'footer', 'checkout'];
const normEmail = (e) => String(e || '').trim().toLowerCase();

const WELCOME_PCT = 5;
const WELCOME_EXPIRY_DAYS = 30;

// Mints the "5% off your first order" coupon promised by the newsletter
// popup. Unique per subscriber + maxUses: 1 so it IS a first-order-only
// discount without needing separate per-user order-history checks.
// Idempotent: repeat subscribe calls (e.g. re-opening the popup) reuse the
// same code instead of minting a new one each time.
async function ensureWelcomeCoupon(subscriber) {
  if (subscriber.welcomeCode) return subscriber.welcomeCode;
  const code = `WELCOME5-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  await Coupon.create({
    code,
    type: 'pct',
    value: WELCOME_PCT,
    maxUses: 1,
    expiresAt: new Date(Date.now() + WELCOME_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });
  subscriber.welcomeCode = code;
  await subscriber.save();
  return code;
}

router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, source = 'footer' } = req.body || {};
    const clean = normEmail(email);
    if (!EMAIL_RE.test(clean)) return res.status(400).json({ message: 'Valid email is required' });
    const cleanSource = SOURCES.includes(source) ? source : 'footer';

    let sub = await Subscriber.findOne({ email: clean });
    let isNew = false;
    if (sub) {
      if (!sub.active) {
        sub.active = true;
        sub.unsubscribedAt = null;
        sub.source = cleanSource;
        await sub.save();
      }
    } else {
      sub = await Subscriber.create({ email: clean, source: cleanSource });
      isNew = true;
    }

    const couponCode = await ensureWelcomeCoupon(sub);
    if (isNew) sendWelcomeCoupon(clean, couponCode).catch(() => {});
    res.status(isNew ? 201 : 200).json({ message: 'Subscribed successfully!', couponCode });
  } catch (error) {
    if (error && error.code === 11000) {
      // Lost the create race — the winner already has (or is minting) a
      // coupon; look it up instead of leaving the caller without a code.
      const sub = await Subscriber.findOne({ email: normEmail(req.body && req.body.email) });
      const couponCode = sub ? await ensureWelcomeCoupon(sub) : undefined;
      return res.status(200).json({ message: 'Subscribed successfully!', couponCode });
    }
    if (error && error.name === 'ValidationError')
      return res.status(400).json({ message: 'Invalid subscription data' });
    next(error);
  }
});

router.post('/unsubscribe', async (req, res, next) => {
  try {
    const clean = normEmail(req.body && req.body.email);
    if (!EMAIL_RE.test(clean)) return res.status(400).json({ message: 'Valid email required' });
    const sub = await Subscriber.findOne({ email: clean });
    // Uniform success — never reveal whether an address was subscribed.
    if (sub && sub.active) {
      sub.active = false;
      sub.unsubscribedAt = new Date();
      await sub.save();
    }
    res.json({ message: 'Unsubscribed' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
