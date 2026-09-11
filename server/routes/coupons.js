const express = require('express');
const Coupon = require('../models/Coupon');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ message: 'code required' });
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon' });
    const check = coupon.isUsable(Number(subtotal));
    if (!check.ok) return res.status(400).json({ message: check.reason });
    res.json({ code: coupon.code, discount: coupon.calcDiscount(Number(subtotal)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/', authRequired, requireAdmin, async (_req, res) => {
  res.json(await Coupon.find().sort({ createdAt: -1 }));
});

router.post('/', authRequired, requireAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.create({
      ...req.body,
      code: req.body.code.toUpperCase(),
    });
    res.status(201).json(coupon);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
