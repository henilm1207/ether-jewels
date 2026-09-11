const express = require('express');
const Inquiry = require('../models/Inquiry');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const inquiry = await Inquiry.create(req.body);
    res.status(201).json({ message: 'Message received', inquiry });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.get('/', authRequired, requireAdmin, async (_req, res) => {
  res.json(await Inquiry.find().sort({ createdAt: -1 }).limit(100));
});

module.exports = router;
