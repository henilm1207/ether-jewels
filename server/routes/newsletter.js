const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');

router.post('/subscribe', async (req, res) => {
  try {
    const { email, source = 'footer' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.active)
        return res.status(400).json({ message: 'You have already subscribed!' });
      existing.active = true;
      existing.unsubscribedAt = null;
      existing.source = source;
      await existing.save();
      return res.status(200).json({ message: 'Resubscribed successfully!' });
    }

    await Subscriber.create({ email: email.toLowerCase(), source });
    res.status(201).json({ message: 'Subscribed successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/unsubscribe', async (req, res) => {
  const sub = await Subscriber.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!sub) return res.status(404).json({ message: 'Not subscribed' });
  sub.active = false;
  sub.unsubscribedAt = new Date();
  await sub.save();
  res.json({ message: 'Unsubscribed' });
});

module.exports = router;
