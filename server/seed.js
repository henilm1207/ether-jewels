const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Category = require('./models/Category');
const { DEFAULT_RING_SIZES, isRingCategory } = require('./config/catalog');

dotenv.config();

const isRing = (cat) => isRingCategory(cat);

// Catalog seed data intentionally emptied — the catalog is now managed
// exclusively through the admin panel (/admin). `npm run seed` is a no-op
// until real seed entries are added back here on purpose.
const categories = [];

// Product seed data intentionally emptied — the catalog is now managed
// exclusively through the admin panel (/admin). See categories note above.
const raw = [];

const products = raw.map((p) => ({
  name: p.name,
  slug: p.slug,
  legacySlugs: p.legacySlugs || [],
  styleCode: p.style || undefined,
  shape: p.shape || null,
  price: p.price,
  kt18Delta: p.kt18Delta ?? 200,
  currency: 'USD',
  description: p.description,
  shortDescription: p.shortDescription,
  category: p.category,
  images: p.images,
  video: null,
  variants: p.variants,
  tags: p.tags || [],
  badge: p.badge || null,
  status: 'active',
  inStock: true,
  stockQty: 10,
  featured: !!p.featured,
  sizes: isRing(p.category) ? DEFAULT_RING_SIZES : [],
  defaultSize: isRing(p.category) ? '7' : null,
  details: { sideStoneCertified: false, deliveryDays: 30 },
  ratingAvg: 0,
  ratingCount: 0,
}));

const seedDB = async () => {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force-prod')) {
    console.error('Refusing to seed in production without --force-prod');
    process.exit(1);
  }
  if (!categories.length && !products.length) {
    console.error('Seed data is empty (intentionally neutralized) — nothing to do. Aborting before any delete.');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding');

    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log('Cleared products + categories');

    await Category.insertMany(categories);
    console.log(`Seeded ${categories.length} categories`);

    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products`);

    await mongoose.disconnect();
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

if (require.main === module) seedDB();

module.exports = { seedDB };
