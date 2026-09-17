const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const escapeRegExp = (s) => String(s).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users/admin/all?q=&page=&limit= — customer list with lifetime
// value. Two cheap queries + an in-memory merge rather than a $lookup
// aggregation: catalog-scale user counts don't need it, and this stays
// readable. passwordHash is `select: false` on the model, so it's already
// excluded without anything here having to remember to strip it.
router.get('/admin/all', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { q, page = '1', limit = '50' } = req.query;
    const filter = { role: 'customer' };
    if (q) {
      const re = new RegExp(escapeRegExp(String(q).trim()), 'i');
      filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const stats = await Order.aggregate([
      { $match: { user: { $in: userIds }, 'payment.status': 'paid' } },
      { $group: { _id: '$user', lifetimeValue: { $sum: '$pricing.total' }, orderCount: { $sum: 1 }, lastOrderAt: { $max: '$createdAt' } } },
    ]);
    const statsById = {};
    for (const s of stats) statsById[String(s._id)] = s;

    const items = users.map((u) => {
      const s = statsById[String(u._id)];
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        orderCount: s?.orderCount || 0,
        lifetimeValue: s?.lifetimeValue || 0,
        lastOrderAt: s?.lastOrderAt || null,
      };
    });

    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
