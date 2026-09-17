// One-time data fix: products created with a single generic "Gold" variant
// can't be found by the Collection page's Metal Color filter (it matches
// variant.material against "Rose"/"White"/"Yellow", which a bare "Gold"
// never contains — see client/src/pages/Collection.jsx). Splits that one
// variant into the three metal-color variants the admin form itself always
// creates (client/src/pages/admin/ProductForm.jsx), at the same price.
// Idempotent: only touches products with exactly one variant named "Gold".
//
// Usage:
//   npm run split-gold-variants -- --dry-run
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const METAL_COLORS = [
  { name: 'Yellow Gold', swatch: '#FFD700' },
  { name: 'Rose Gold', swatch: '#E0BFB8' },
  { name: 'White Gold', swatch: '#E8E8E8' },
];

async function main() {
  const dry = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const targets = await Product.find({
    variants: { $size: 1 },
    'variants.0.material': 'Gold',
  });

  console.log(`Found ${targets.length} product(s) with a single generic "Gold" variant (dry=${dry})`);

  let updated = 0;
  for (const p of targets) {
    const base = p.variants[0];
    const newVariants = METAL_COLORS.map((m) => ({
      name: m.name,
      material: m.name,
      color: m.swatch,
      price: base.price,
      inStock: base.inStock,
      image: base.image || '',
    }));
    if (dry) {
      console.log(`PLAN  ${p.name} -> ${newVariants.map((v) => v.name).join(', ')}`);
      updated++;
      continue;
    }
    p.variants = newVariants;
    await p.save();
    console.log(`FIXED ${p.name} -> ${newVariants.map((v) => v.name).join(', ')} ($${p.price})`);
    updated++;
  }

  console.log(`\n${dry ? 'Would update' : 'Updated'}: ${updated}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('SPLIT_FAIL', e);
  process.exit(1);
});
