// Payment aggregator: runtime publishable config + gateway routers.
// Secrets never leave the server — the client only learns what's needed to
// open Razorpay Checkout or render SkyDo's wire-instructions form.
const express = require('express');
const razorpayRouter = require('./payments/razorpay');
const skydoRouter = require('./payments/skydo');

const router = express.Router();

// GET /api/payments/config — safe public config for the checkout page.
router.get('/config', (_req, res) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    skydoCurrencies: skydoRouter.availableCurrencies(),
    currency: 'USD',
  });
});

router.use('/razorpay', razorpayRouter);
router.use('/skydo', skydoRouter);

module.exports = router;
