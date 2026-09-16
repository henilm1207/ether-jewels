// dotenv FIRST — before any local require: route/lib modules read
// process.env at load time (e.g. lib/localImages upload dir), so the .env
// file must be parsed before those modules initialize.
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const productRoutes = require('./routes/products');
const newsletterRoutes = require('./routes/newsletter');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const bagRoutes = require('./routes/bag');
const wishlistRoutes = require('./routes/wishlist');
const verifyRoutes = require('./routes/verify');
const paymentRoutes = require('./routes/payments');
const { webhookHandler } = require('./routes/payments/stripe');
const couponRoutes = require('./routes/coupons');
const reviewRoutes = require('./routes/reviews');
const inquiryRoutes = require('./routes/inquiries');
const uploadRoutes = require('./routes/uploads');
const pricingSettingsRoutes = require('./routes/pricingSettings');
const aiRoutes = require('./routes/ai');
const dbViewerRoutes = require('./routes/dbViewer');
const { authRequired, requireAdmin } = require('./middleware/auth');

function validateEnv() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  const secret = process.env.JWT_SECRET || '';
  if (!secret || secret.length < 32 || secret === 'dev-only-change-me') {
    throw new Error('JWT_SECRET must be set to a long random string (>=32 chars)');
  }
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Anti-copy headers: CSP allows self + https imagery (local /uploads plus
// paste-URL fallback for external https images), tight
// referrer policy so image URLs leak less context off-site. Helmet hides
// X-Powered-By (also disabled above) and sets frame/type protections that
// make naive iframe-cloning harder.
// Fonts are self-hosted (/fonts/*.woff2) — no Google Fonts hosts needed.
// object-src 'none' + base-uri 'self' keep the CSP effective against XSS;
// HSTS is pinned to 1yr + subdomains (deliberately no `preload`: that flag
// is a near-irreversible commitment via hstspreload.org).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", 'data:', 'https:', 'https://www.paypalobjects.com'],
      mediaSrc: ["'self'", 'data:'],
      // Checkout SDKs: Stripe.js + PayPal Buttons (sandbox serves from both hosts).
      // Loaded only on /cart after cookie consent (see lib/consent.js).
      scriptSrc: ["'self'", 'https://js.stripe.com', 'https://www.paypal.com', 'https://www.sandbox.paypal.com'],
      styleSrc: ["'self'", "'unsafe-inline'"], // React inline style={} needs this
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://api.stripe.com', ...frontendOrigins],
      // 3-D Secure + PayPal approval windows render provider iframes.
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://www.paypal.com', 'https://www.sandbox.paypal.com'],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: frontendOrigins }));
// Stripe webhooks need the RAW body for signature verification — register
// before express.json() consumes the stream.
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler);
app.use(express.json({ limit: '50kb' }));
app.use(mongoSanitize());

// Local product images: serve the uploads directory statically so the
// storefront fetches images as <API_BASE>/uploads/YYYY-MM/<uuid>.webp.
// UPLOADS_DIR points at the persistent VPS volume in production; the helper
// defaults to server/public/uploads for dev. Registered before the SPA
// fallback below so /uploads/* never resolves to index.html.
try {
  const { getUploadDir, ensureUploadDir } = require('./lib/localImages');
  ensureUploadDir();
  app.use('/uploads', express.static(getUploadDir(), { maxAge: '30d', immutable: true }));
} catch (e) {
  console.warn('Local uploads unavailable:', e.message);
}

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const strictLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
// Bag + wishlist write-heavy pair: the storefront's debounced dual sync
// (leading + trailing PUTs, moves, hydration) legitimately bursts here, so
// these get their own bucket instead of sharing the strict one below —
// otherwise failure retries starve legitimate sync traffic into 429s.
const bagWishlistLimiter = rateLimit({ windowMs: 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });
// Anti-scrape: public catalog is the easiest full-dump target
// (list limit 50 × pages). Tighter per-minute cap slows bulk copying
// without affecting normal browsing; checkout/auth keep their own limits.
const catalogLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
// Auth attempts get their own budget so credential-stuffing can't hide in
// (or starve) the shared pool; per-account lockout lives in routes/auth.js.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/', globalLimiter);
app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
app.use(['/api/bag', '/api/wishlist'], bagWishlistLimiter);
app.use(['/api/auth/profile', '/api/auth/password', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/verify', '/api/payments/stripe', '/api/payments/paypal', '/api/coupons/validate', '/api/newsletter/subscribe', '/api/inquiries', '/api/reviews', '/api/uploads', '/api/ai/describe', '/api/pricing-settings'], strictLimiter);
app.use(['/api/products', '/api/categories'], catalogLimiter);

app.use('/api/products', productRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bag', bagRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/pricing-settings', pricingSettingsRoutes);
app.use('/api/ai', aiRoutes);

// Read-only browser DB viewer — dev only, explicitly enabled, admin only
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.ENABLE_DB_VIEWER === 'true'
) {
  app.use('/admin/db', authRequired, requireAdmin, dbViewerRoutes);
}

app.get('/api/health', async (req, res) => {
  // Additive `db` field (monitors matching on {status:'ok'} keep working).
  // Never leaks internals — only up/down, details stay in server logs.
  let db = 'down';
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      db = 'up';
    }
  } catch (e) {
    console.warn('health db ping failed:', e.message);
  }
  res.json({ status: 'ok', db });
});

// Single-domain production: serve the Vite build (client/dist) from Express
// so https://<domain>/ serves the storefront and /api/* serves the API.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '1y', immutable: true }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Central error handler — hide internals in production
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  if (err && (err.name === 'CastError' || err.name === 'ValidationError')) {
    return res.status(400).json({ message: 'Invalid request data' });
  }
  // Write collisions from overlapping requests (concurrent fetch-modify-save
  // on one Bag/Wishlist doc, or a first-touch upsert race). The storefront
  // serializes its writes and backs off on 409, so these self-heal instead
  // of cascading into retry storms.
  if (err && (err.name === 'VersionError' || err.code === 11000)) {
    res.set('Retry-After', '1');
    return res.status(409).json({ message: 'Write conflict — please retry', code: 'WRITE_CONFLICT' });
  }
  if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600) {
    const msg = err.status < 500 || process.env.NODE_ENV !== 'production' ? err.message : 'Server error';
    return res.status(err.status).json({ message: msg });
  }
  console.error('Unhandled error:', err && err.message);
  const msg = process.env.NODE_ENV === 'production' ? 'Server error' : (err && err.message) || 'Server error';
  res.status(500).json({ message: msg });
});

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email && !password) return; // bootstrap not configured
  if (!email || password.length < 8) {
    console.warn('ADMIN_EMAIL/ADMIN_PASSWORD incomplete — skipping admin bootstrap (password must be 8+ chars)');
    return;
  }
  const User = require('./models/User');
  // One-shot bootstrap: once ANY admin exists, env creds stop working —
  // a leaked .env can never mint new superusers.
  const anyAdmin = await User.findOne({ role: 'admin' }).select('_id');
  if (anyAdmin) return;
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      console.warn(`Admin bootstrap: ${email} exists but is not admin — leaving untouched`);
    }
    return;
  }
  const nameParts = (process.env.ADMIN_NAME || 'Store Admin').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Store';
  const lastName = nameParts.slice(1).join(' ') || 'Admin';
  await User.create({
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.slice(0, 100),
    email,
    passwordHash: await User.hashPassword(password),
    phone: process.env.ADMIN_PHONE || '+10000000000',
    role: 'admin',
  });
  console.log(`Admin bootstrap: created admin ${email}`);
}

async function boot() {
  validateEnv();
  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
  try {
    await ensureAdmin();
  } catch (error) {
    console.error('Admin bootstrap failed:', error.message);
  }
  try {
    require('./lib/expiry').startExpirySweeper();
  } catch (error) {
    console.error('Expiry sweeper failed to start:', error.message);
  }
  const PORT = process.env.PORT || 5001;
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT} (LAN: http://${HOST === '0.0.0.0' ? require('os').networkInterfaces()['Wi-Fi']?.find?.((a) => a.family === 'IPv4')?.address || 'LAN-IP' : HOST}:${PORT})`);
  });
}

if (require.main === module) boot();

module.exports = app;
module.exports.ensureAdmin = ensureAdmin;
module.exports.boot = boot;
