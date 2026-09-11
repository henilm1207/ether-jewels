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
const couponRoutes = require('./routes/coupons');
const reviewRoutes = require('./routes/reviews');
const inquiryRoutes = require('./routes/inquiries');
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

app.use(helmet());
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: frontendOrigins }));
app.use(express.json({ limit: '50kb' }));
app.use(mongoSanitize());

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const strictLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api/', globalLimiter);
app.use(['/api/auth/login', '/api/auth/register', '/api/coupons/validate', '/api/newsletter/subscribe', '/api/inquiries', '/api/reviews'], strictLimiter);

app.use('/api/products', productRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/inquiries', inquiryRoutes);

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
  console.error('Unhandled error:', err && err.message);
  const msg = process.env.NODE_ENV === 'production' ? 'Server error' : (err && err.message) || 'Server error';
  res.status(500).json({ message: msg });
});

async function boot() {
  validateEnv();
  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) boot();

module.exports = app;
