// Unpaid-order expiry sweeper — cancels pending orders past expiresAt and
// releases their coupons. Single-process interval (fine for one API dyno;
// replace with Atlas Triggers/cron when horizontally scaled).
const Order = require('../models/Order');
const { releaseCoupon } = require('./quote');

async function sweepExpiredOrders(limit = 100) {
  const due = await Order.find({
    status: 'pending',
    'payment.status': { $ne: 'paid' },
    expiresAt: { $lte: new Date() },
  })
    .limit(limit)
    .select('_id');
  let cancelled = 0;
  for (const row of due) {
    const order = await Order.findById(row._id);
    if (!order || order.status !== 'pending' || order.payment.status === 'paid') continue;
    order.status = 'cancelled';
    await releaseCoupon(order);
    await order.save();
    cancelled++;
  }
  return cancelled;
}

function startExpirySweeper(intervalMs = 60 * 60 * 1000) {
  const tick = () =>
    sweepExpiredOrders().catch((e) => console.error('expiry sweep failed:', e.message));
  const timer = setInterval(tick, intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = { sweepExpiredOrders, startExpirySweeper };
