// One-click catalog bootstrap — mirrors client/src/data/catalog.js.
// Idempotent (upsert by key, never deletes): safe to re-run anytime.
// Usage: npm run ensure-catalog [--dry-run]
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const RING_LEAVES = new Set(['solitaire-rings', 'halo-rings', 'engagement-rings', 'three-stone-rings', 'bands']);

const TREE = [
  { key: 'rings', name: 'Rings', subs: ['Solitaire Rings', 'Halo Rings', 'Engagement Rings', 'Three Stone Rings', 'Bands'] },
  { key: 'bracelets', name: 'Bracelets', subs: ['Tennis Bracelets', 'Bangle Bracelets'] },
  { key: 'necklaces', name: 'Necklaces', subs: ['Tennis Necklaces', 'Solitaire Necklaces', 'Diamond Necklaces'] },
  { key: 'chains', name: 'Chains', subs: ['Cuban Link Chains', 'Rope Chains', 'Figaro Chains', 'Tennis Chains'] },
  { key: 'earrings', name: 'Earrings', subs: ['Stud Earrings', 'Halo Earrings', 'Drop Earrings', 'Hoop Earrings'] },
  { key: 'hiphop', name: 'Hiphop', subs: ['Hiphop Pendants', 'Hiphop Chains', 'Hiphop Bracelets'] },
];

const slugify = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

(async () => {
  const dry = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  let order = 0;
  const ops = [];
  for (const v of TREE) {
    const subKeys = v.subs.map(slugify);
    ops.push({
      key: v.key,
      doc: {
        key: v.key, name: v.name, parent: 'Collection',
        aggregateKeys: subKeys, requiresSize: false, sortOrder: ++order, active: true,
      },
    });
    for (const name of v.subs) {
      const key = slugify(name);
      ops.push({
        key,
        doc: {
          key, name, parent: v.name,
          requiresSize: RING_LEAVES.has(key), sortOrder: ++order, active: true,
        },
      });
    }
  }
  console.log(`PLAN ${ops.length} upserts (dry=${dry})`);
  if (!dry) {
    for (const { key, doc } of ops) {
      const r = await Category.updateOne({ key }, { $setOnInsert: doc }, { upsert: true });
      console.log(`${r.upsertedCount ? 'CREATE' : 'EXISTS '} ${key}`);
    }
    // Move Lumina off the retired `rings` aggregate key (only if still there).
    const lum = await mongoose.connection.db.collection('products').findOne({ slug: 'the-lumina-diamond-cross-ring' });
    if (lum && lum.category === 'rings') {
      await mongoose.connection.db.collection('products').updateOne({ _id: lum._id }, { $set: { category: 'halo-rings' } });
      console.log('LUMINA rings -> halo-rings');
    } else {
      console.log('LUMINA untouched (category=' + (lum && lum.category) + ')');
    }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('ENSURE_FAIL ' + e.message); process.exit(1); });
