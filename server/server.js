const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const productRoutes = require('./routes/products');
const newsletterRoutes = require('./routes/newsletter');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payments');
const { webhookHandler } = require('./routes/payments/stripe');
const couponRoutes = require('./routes/coupons');
const reviewRoutes = require('./routes/reviews');
const inquiryRoutes = require('./routes/inquiries');
const uploadRoutes = require('./routes/uploads');
const aiRoutes = require('./routes/ai');
const dbViewerRoutes = require('./routes/dbViewer');
const { authRequired, requireAdmin } = require('./middleware/auth');

dotenv.config();

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

// Anti-copy headers: CSP allows self + Cloudinary imagery only, tight
// referrer policy so image URLs leak less context off-site. Helmet hides
// X-Powered-By (also disabled above) and sets frame/type protections that
// make naive iframe-cloning harder.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://www.paypalobjects.com'],
      mediaSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      // Checkout SDKs: Stripe.js + PayPal Buttons (sandbox serves from both hosts).
      scriptSrc: ["'self'", 'https://js.stripe.com', 'https://www.paypal.com', 'https://www.sandbox.paypal.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://api.stripe.com', ...frontendOrigins],
      // 3-D Secure + PayPal approval windows render provider iframes.
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://www.paypal.com', 'https://www.sandbox.paypal.com'],
      frameAncestors: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: frontendOrigins }));
// Stripe webhooks need the RAW body for signature verification — register
// before express.json() consumes the stream.
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler);
app.use(express.json({ limit: '50kb' }));
app.use(mongoSanitize());

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const strictLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
// Anti-scrape: public catalog is the easiest full-dump target
// (list limit 50 × pages). Tighter per-minute cap slows bulk copying
// without affecting normal browsing; checkout/auth keep their own limits.
const catalogLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api/', globalLimiter);
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/wishlist', '/api/cart', '/api/payments/stripe', '/api/payments/paypal', '/api/coupons/validate', '/api/newsletter/subscribe', '/api/inquiries', '/api/reviews', '/api/uploads', '/api/ai/describe'], strictLimiter);
app.use(['/api/products', '/api/categories'], catalogLimiter);

app.use('/api/products', productRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/ai', aiRoutes);

// Read-only browser DB viewer — dev only, explicitly enabled, admin only
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.ENABLE_DB_VIEWER === 'true'
) {
  app.use('/admin/db', authRequired, requireAdmin, dbViewerRoutes);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

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
