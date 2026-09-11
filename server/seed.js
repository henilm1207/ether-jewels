const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Category = require('./models/Category');
const { DEFAULT_RING_SIZES, RING_CATEGORIES } = require('./config/catalog');

dotenv.config();

const isRing = (cat) => RING_CATEGORIES.includes(cat);

const categories = [
  {
    key: 'rings',
    name: 'Rings',
    parent: 'Collection',
    description:
      'From timeless solitaires to modern statement designs, our ring collection is crafted to celebrate every moment. Each piece is thoughtfully designed with precision, brilliance, and enduring elegance.',
    aggregateKeys: ['solitaire-rings', 'halo-rings', 'engagement-rings', 'three-stone-rings', 'bands'],
    requiresSize: true,
    sortOrder: 1,
  },
  { key: 'solitaire-rings', name: 'Solitaire Rings', parent: 'Rings', requiresSize: true, sortOrder: 2 },
  { key: 'halo-rings', name: 'Halo Rings', parent: 'Rings', requiresSize: true, sortOrder: 3 },
  { key: 'engagement-rings', name: 'Engagement Rings', parent: 'Rings', requiresSize: true, sortOrder: 4 },
  { key: 'three-stone-rings', name: 'Three Stone Rings', parent: 'Rings', requiresSize: true, sortOrder: 5 },
  { key: 'bands', name: 'Bands', parent: 'Rings', requiresSize: true, sortOrder: 6 },
  { key: 'earrings', name: 'EarRings', parent: 'EarRings', sortOrder: 7 },
  { key: 'bracelets', name: 'Bracelets', parent: 'Bracelets', sortOrder: 8 },
  { key: 'necklaces', name: 'Necklaces', parent: 'Necklaces', sortOrder: 9 },
  // Aliases (kept for old URLs)
  { key: 'rings-1', name: 'Rings', parent: 'Collection: Rings', aliasOf: 'rings' },
  { key: 'halo-rings-1', name: 'Halo Rings', parent: 'Rings', aliasOf: 'halo-rings' },
  { key: 'bracelets-1', name: 'Bracelets', parent: 'Bracelets', aliasOf: 'bracelets' },
  { key: 'marquise-1', name: 'Marquise', parent: 'Shop By Shape', aliasOf: 'marquise' },
  // Shop By Shape
  ...['Round', 'Emerald', 'Princess', 'Cushion', 'Oval', 'Pear', 'Marquise', 'Asscher', 'Heart'].map(
    (shape) => ({
      key: shape.toLowerCase(),
      name: shape,
      parent: 'Shop By Shape',
      shape,
    })
  ),
  // NOTE v2 reserved: `hiphop` will be inserted here with requiresLength:true — no code change needed.
];

// Migrated from client/src/data/products.js (truth). Adds USD, sizes, styleCode, legacySlugs.
const raw = [
  {
    name: 'The Pear Accent Diamond Engagement Ring',
    slug: 'the-pear-accent-diamond-engagement-ring',
    legacySlugs: ['pear-accent-diamond-engagement-ring'],
    shape: 'Pear',
    price: 1500,
    style: 'MJ72R',
    kt18Delta: 800,
    description: 'A stunning pear-shaped diamond engagement ring with accent stones, crafted for timeless elegance.',
    shortDescription: 'Lab Grown Pear Diamond Ring',
    category: 'solitaire-rings',
    images: ['/images/products/product-1-1.webp', '/images/products/product-1-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1500, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1500, color: '#E8E8E8', material: 'White Gold' },
      { name: 'Yellow Gold', price: 1500, color: '#FFD700', material: 'Yellow Gold' },
    ],
    tags: ['new', 'bestseller'],
    badge: 'new',
    featured: true,
  },
  {
    name: 'Liora Oval Hidden Halo Setting',
    slug: 'liora-oval-hidden-halo-setting',
    shape: 'Oval',
    price: 1500,
    style: 'MJ47R',
    kt18Delta: 200,
    description: 'An oval diamond with a hidden halo setting that creates a mesmerizing circle of brilliance.',
    shortDescription: 'Oval Hidden Halo Ring',
    category: 'halo-rings',
    images: ['/images/products/product-2-1.webp', '/images/products/product-2-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1500, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1500, color: '#E8E8E8', material: 'White Gold' },
      { name: 'Yellow Gold', price: 1500, color: '#FFD700', material: 'Yellow Gold' },
    ],
    tags: ['new'],
    badge: 'new',
    featured: true,
  },
  {
    name: 'Pear-Cut Split-Shank Solitaire',
    slug: 'the-pear-cut-split-shank-solitaire',
    legacySlugs: ['pear-cut-split-shank-solitaire'],
    shape: 'Pear',
    price: 1200,
    style: 'MJ64R',
    kt18Delta: 400,
    description: 'A pear-cut diamond set on a split-shank band for a modern, architectural look.',
    shortDescription: 'Pear-Cut Split-Shank Ring',
    category: 'solitaire-rings',
    images: ['/images/products/product-3-1.webp', '/images/products/product-3-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1200, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1200, color: '#E8E8E8', material: 'White Gold' },
      { name: 'Yellow Gold', price: 1200, color: '#FFD700', material: 'Yellow Gold' },
    ],
    tags: ['bestseller'],
    featured: true,
  },
  {
    name: 'Emerald-Cut Split-Shank Solitaire',
    slug: 'the-emerald-cut-split-shank-solitaire',
    legacySlugs: ['emerald-cut-split-shank-solitaire'],
    shape: 'Emerald',
    price: 1100,
    style: 'MJ65R',
    kt18Delta: 500,
    description: 'An emerald-cut diamond with split-shank detailing, offering clean lines and modern sophistication.',
    shortDescription: 'Emerald-Cut Solitaire Ring',
    category: 'solitaire-rings',
    images: ['/images/products/product-4-1.webp', '/images/products/product-4-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1100, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1100, color: '#E8E8E8', material: 'White Gold' },
      { name: 'Yellow Gold', price: 1100, color: '#FFD700', material: 'Yellow Gold' },
    ],
    tags: [],
    featured: true,
  },
  {
    name: 'The Round Brilliant Split-Shank Solitaire',
    slug: 'the-round-brilliant-split-shank-solitaire',
    legacySlugs: ['round-brilliant-split-shank-solitaire'],
    shape: 'Round',
    price: 1200,
    style: 'MJ66R',
    kt18Delta: 500,
    description: 'A classic round brilliant diamond on a split-shank band, combining tradition with contemporary design.',
    shortDescription: 'Round Brilliant Solitaire',
    category: 'solitaire-rings',
    images: ['/images/products/product-5-1.webp', '/images/products/product-5-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1200, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1200, color: '#E8E8E8', material: 'White Gold' },
      { name: 'Yellow Gold', price: 1200, color: '#FFD700', material: 'Yellow Gold' },
    ],
    tags: ['bestseller'],
    featured: true,
  },
  {
    name: 'The Celestine Halo Ring',
    slug: 'celestine-halo-ring',
    shape: 'Round',
    price: 1800,
    description: 'A round brilliant center stone surrounded by a delicate halo of pavé diamonds.',
    shortDescription: 'Round Halo Pavé Ring',
    category: 'halo-rings',
    images: ['/images/products/product-1-1.webp', '/images/products/product-1-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1800, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1800, color: '#E8E8E8', material: 'White Gold' },
    ],
    tags: ['new'],
    badge: 'new',
    featured: false,
  },
  {
    name: 'Three Stone Pavé Engagement Ring',
    slug: 'three-stone-pave-engagement-ring',
    shape: 'Round',
    price: 2200,
    description: 'Three stunning lab-grown diamonds set in a pavé band, symbolizing past, present, and future.',
    shortDescription: 'Three Stone Pavé Ring',
    category: 'three-stone-rings',
    images: ['/images/products/product-2-1.webp', '/images/products/product-2-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 2200, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 2200, color: '#E8E8E8', material: 'White Gold' },
    ],
    tags: [],
    featured: false,
  },
  {
    name: 'The Eternal Band',
    slug: 'eternal-band',
    price: 800,
    description: 'A timeless wedding band with pavé-set diamonds for everyday elegance.',
    shortDescription: 'Pavé Wedding Band',
    category: 'bands',
    images: ['/images/products/product-3-1.webp', '/images/products/product-3-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 800, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 800, color: '#E8E8E8', material: 'White Gold' },
      { name: 'Yellow Gold', price: 800, color: '#FFD700', material: 'Yellow Gold' },
    ],
    tags: ['bestseller'],
    featured: false,
  },
  {
    name: 'The Lumina Engagement Ring',
    slug: 'lumina-engagement-ring',
    shape: 'Round',
    price: 1600,
    description: 'A luminous engagement ring featuring a round diamond with delicate side stones.',
    shortDescription: 'Round Diamond Side Stone Ring',
    category: 'engagement-rings',
    images: ['/images/products/product-4-1.webp', '/images/products/product-4-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1600, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1600, color: '#E8E8E8', material: 'White Gold' },
    ],
    tags: ['new'],
    badge: 'new',
    featured: false,
  },
  {
    name: 'The Aspen Drop Earrings',
    slug: 'aspen-drop-earrings',
    shape: 'Pear',
    price: 950,
    description: 'Elegant drop earrings featuring pear-shaped lab-grown diamonds with a delicate setting.',
    shortDescription: 'Pear Diamond Drop Earrings',
    category: 'earrings',
    images: ['/images/products/product-5-1.webp', '/images/products/product-5-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 950, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 950, color: '#E8E8E8', material: 'White Gold' },
    ],
    tags: ['new'],
    badge: 'new',
    featured: false,
  },
  {
    name: 'The Serene Tennis Bracelet',
    slug: 'serene-tennis-bracelet',
    shape: 'Round',
    price: 2500,
    description: 'A classic tennis bracelet with round brilliant lab-grown diamonds in a seamless setting.',
    shortDescription: 'Diamond Tennis Bracelet',
    category: 'bracelets',
    images: ['/images/products/product-1-1.webp', '/images/products/product-1-2.webp'],
    variants: [{ name: 'White Gold', price: 2500, color: '#E8E8E8', material: 'White Gold' }],
    tags: [],
    featured: false,
  },
  {
    name: 'The Aria Pendant Necklace',
    slug: 'aria-pendant-necklace',
    shape: 'Round',
    price: 1100,
    description: 'A delicate pendant necklace featuring a single round brilliant diamond on a fine chain.',
    shortDescription: 'Round Diamond Pendant',
    category: 'necklaces',
    images: ['/images/products/product-2-1.webp', '/images/products/product-2-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1100, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1100, color: '#E8E8E8', material: 'White Gold' },
    ],
    tags: ['new'],
    badge: 'new',
    featured: false,
  },
  {
    name: 'The Trilogy Three-Stone Ring',
    slug: 'trilogy-three-stone-ring',
    shape: 'Oval',
    price: 2800,
    description: 'Three oval diamonds set in a trilogy arrangement, representing your journey together.',
    shortDescription: 'Oval Trilogy Ring',
    category: 'three-stone-rings',
    images: ['/images/products/product-3-1.webp', '/images/products/product-3-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 2800, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 2800, color: '#E8E8E8', material: 'White Gold' },
    ],
    tags: [],
    featured: false,
  },
  {
    name: 'The Velvet Halo Earrings',
    slug: 'velvet-halo-earrings',
    shape: 'Round',
    price: 1300,
    description: 'Stud earrings with a halo of pavé diamonds surrounding a center round brilliant stone.',
    shortDescription: 'Halo Stud Earrings',
    category: 'earrings',
    images: ['/images/products/product-4-1.webp', '/images/products/product-4-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 1300, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 1300, color: '#E8E8E8', material: 'White Gold' },
    ],
    tags: [],
    featured: false,
  },
  {
    name: 'The Minimalist Wedding Band',
    slug: 'minimalist-wedding-band',
    price: 600,
    description: 'A clean, polished wedding band with no stones — pure and timeless.',
    shortDescription: 'Polished Wedding Band',
    category: 'bands',
    images: ['/images/products/product-5-1.webp', '/images/products/product-5-2.webp'],
    variants: [
      { name: 'Rose Gold', price: 600, color: '#E0BFB8', material: 'Rose Gold' },
      { name: 'White Gold', price: 600, color: '#E8E8E8', material: 'White Gold' },
      { name: 'Yellow Gold', price: 600, color: '#FFD700', material: 'Yellow Gold' },
    ],
    tags: ['bestseller'],
    featured: false,
  },
];

const products = raw.map((p) => ({
  name: p.name,
  slug: p.slug,
  legacySlugs: p.legacySlugs || [],
  styleCode: p.style || undefined,
  shape: p.shape || null,
  price: p.price,
  kt18Delta: p.kt18Delta || 200,
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

seedDB();
