const express = require('express');
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/validate', async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim())
      return res.status(400).json({ message: 'code required' });
    const n = Number(subtotal);
    if (!Number.isFinite(n) || n < 0)
      return res.status(400).json({ message: 'Invalid subtotal' });
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon' });
    const check = coupon.isUsable(n);
    if (!check.ok) return res.status(400).json({ message: check.reason });
    res.json({ code: coupon.code, discount: coupon.calcDiscount(n) });
  } catch (e) {
    next(e);
  }
});

router.get('/', authRequired, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await Coupon.find().sort({ createdAt: -1 }));
  } catch (e) {
    next(e);
  }
});

router.post('/', authRequired, requireAdmin, async (req, res, next) => {  try {
    const { code, type, value, minOrder = 0, maxUses = null, active = true, expiresAt = null } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim())
      return res.status(400).json({ message: 'code required' });
    if (!['pct', 'flat'].includes(type))
      return res.status(400).json({ message: 'Invalid coupon type' });
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ message: 'Invalid value' });
    if (type === 'pct' && (v < 1 || v > 90))
      return res.status(400).json({ message: 'pct value must be 1-90' });
    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      type,
      value: v,
      minOrder: Math.max(0, Number(minOrder) || 0),
      maxUses: maxUses == null ? null : Math.max(1, parseInt(maxUses, 10)),
      active: active !== false,
      expiresAt: expiresAt || null,
    });
    res.status(201).json(coupon);
  } catch (e) {
    if (e && e.code === 11000) return res.status(400).json({ message: 'Coupon code exists' });
    e.status = 400;
    next(e);
  }
});

router.patch('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid coupon id' });
    const patch = {};
    // The moment the owner touches the switch they own the state: clear the
    // auto-off marker so a later coupon release can never override them.
    if (req.body.active !== undefined) {
      patch.active = req.body.active !== false;
      patch.autoOff = false;
    }
    // type + value travel together — the value's own bounds (pct 1-90 vs
    // flat >0) depend on which type applies, so a lone value edit resolves
    // against whichever type the coupon already has.
    if (req.body.type !== undefined || req.body.value !== undefined) {
      const existing = await Coupon.findById(req.params.id).select('type value');
      if (!existing) return res.status(404).json({ message: 'Coupon not found' });
      const type = req.body.type !== undefined ? req.body.type : existing.type;
      if (!['pct', 'flat'].includes(type))
        return res.status(400).json({ message: 'Invalid coupon type' });
      const value = req.body.value !== undefined ? Number(req.body.value) : existing.value;
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ message: 'Invalid value' });
      if (type === 'pct' && (value < 1 || value > 90))
        return res.status(400).json({ message: 'pct value must be 1-90' });
      patch.type = type;
      patch.value = value;
    }
    if (req.body.maxUses !== undefined)
      patch.maxUses = req.body.maxUses == null ? null : Math.max(1, parseInt(req.body.maxUses, 10));
    if (req.body.expiresAt !== undefined) patch.expiresAt = req.body.expiresAt || null;
    if (req.body.minOrder !== undefined) patch.minOrder = Math.max(0, Number(req.body.minOrder) || 0);
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (e) {
    next(e);
  }
});

// DELETE /:id — permanent. Orders keep their own couponCode/discount
// snapshot (never a live reference), so removing a coupon never corrupts
// past order history.
router.delete('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid coupon id' });
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
