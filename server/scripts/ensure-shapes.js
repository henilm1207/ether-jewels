// Shop-by-Shape catalog bootstrap — mirrors ensure-catalog.js.
// Idempotent (upsert by key, never deletes): safe to re-run anytime.
// Usage: npm run ensure-shapes [--dry-run]
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const { DIAMOND_SHAPES } = require('../config/catalog');

const slugify = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

(async () => {
  const dry = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  let order = 0;
  const ops = DIAMOND_SHAPES.map((name) => ({
    key: slugify(name),
    doc: {
      key: slugify(name), name, shape: name, parent: 'Collection',
      sortOrder: ++order, active: true,
    },
  }));
  console.log(`PLAN ${ops.length} upserts (dry=${dry})`);
  if (!dry) {
    for (const { key, doc } of ops) {
      const r = await Category.updateOne({ key }, { $setOnInsert: doc }, { upsert: true });
      console.log(`${r.upsertedCount ? 'CREATE' : 'EXISTS '} ${key}`);
    }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('ENSURE_FAIL ' + e.message); process.exit(1); });
