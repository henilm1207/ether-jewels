// Payment aggregator: runtime publishable config + gateway routers.
// Secrets never leave the server — the client only learns the public keys.
const express = require('express');
const stripeRouter = require('./payments/stripe');
const paypalRouter = require('./payments/paypal');

const router = express.Router();

// GET /api/payments/config — safe public keys for the checkout page.
router.get('/config', (_req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
    paypalMode: process.env.PAYPAL_MODE || 'sandbox',
    currency: 'USD',
  });
});

router.use('/stripe', stripeRouter);
router.use('/paypal', paypalRouter);

module.exports = router;
