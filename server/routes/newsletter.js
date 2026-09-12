const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = ['popup', 'footer', 'checkout'];
const normEmail = (e) => String(e || '').trim().toLowerCase();

router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, source = 'footer' } = req.body || {};
    const clean = normEmail(email);
    if (!EMAIL_RE.test(clean)) return res.status(400).json({ message: 'Valid email is required' });
    const cleanSource = SOURCES.includes(source) ? source : 'footer';

    const existing = await Subscriber.findOne({ email: clean });
    if (existing) {
      // Uniform success — never reveal whether an address was subscribed.
      if (!existing.active) {
        existing.active = true;
        existing.unsubscribedAt = null;
        existing.source = cleanSource;
        await existing.save();
      }
      return res.status(200).json({ message: 'Subscribed successfully!' });
    }

    await Subscriber.create({ email: clean, source: cleanSource });
    res.status(201).json({ message: 'Subscribed successfully!' });
  } catch (error) {
    if (error && error.code === 11000)
      return res.status(200).json({ message: 'Subscribed successfully!' });
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
