// One-off: re-base stored pricing fields from "14KT base + kt18Delta (+
// legacy kt10Delta)" to "10KT base + kt14Delta + kt18Delta" — the schema/UI
// change that removes the ability to ever enter a negative delta.
//
// Preserves each product's CURRENTLY EFFECTIVE price at every karat exactly
// (no visible price change for customers): a product missing kt10Delta/
// kt18Delta entirely gets the pre-migration schema defaults (-100 / 200)
// applied first, matching what it was already effectively selling at.
//
// Idempotent: skips any document that already has kt14Delta stored, so it's
// safe to re-run (e.g. after fixing a partial run). Never deletes anything;
// the old kt10Delta key (if present) is $unset after a successful rebase.
//
// Usage: node scripts/migrate-price-base-to-10kt.js [--dry-run]
require('dotenv').config();
const mongoose = require('mongoose');

const OLD_KT18_DEFAULT = 200;
const OLD_KT10_DEFAULT = -100;

(async () => {
  const dry = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  const col = db.collection('products');

  // Raw find (not the Mongoose model) so we see exactly what's stored,
  // unaffected by schema defaults or the new pre-validate hook.
  const cursor = col.find({ kt14Delta: { $exists: false } });
  let planned = 0;
  let applied = 0;

  for await (const p of cursor) {
    planned++;
    const oldPrice = Number(p.price) || 0;
    const oldKt18 = p.kt18Delta != null ? Number(p.kt18Delta) : OLD_KT18_DEFAULT;
    const oldKt10 = p.kt10Delta != null ? Number(p.kt10Delta) : OLD_KT10_DEFAULT;

    const newPrice = oldPrice + oldKt10; // effective 10KT price becomes the new base
    const newKt14Delta = Math.max(0, oldPrice - newPrice); // = -oldKt10, clamped
    const newKt18Delta = Math.max(0, (oldPrice + oldKt18) - newPrice);

    console.log(
      `${dry ? 'PLAN' : 'APPLY'} ${p.slug || p._id}: ` +
      `price ${oldPrice} -> ${newPrice}, kt18Delta ${oldKt18} -> ${newKt18Delta}, ` +
      `kt10Delta ${oldKt10} -> (removed), kt14Delta -> ${newKt14Delta}`
    );

    if (!dry) {
      await col.updateOne(
        { _id: p._id },
        {
          $set: { price: newPrice, kt14Delta: newKt14Delta, kt18Delta: newKt18Delta },
          $unset: { kt10Delta: '' },
        }
      );
      // Every variant shared the same product-level price under the old
      // model too — keep that invariant under the new one.
      if (Array.isArray(p.variants) && p.variants.length) {
        await col.updateOne(
          { _id: p._id },
          { $set: { 'variants.$[].price': newPrice } }
        );
      }
      applied++;
    }
  }

  console.log(`\n${dry ? 'Would update' : 'Updated'} ${dry ? planned : applied} of ${planned} matching product(s).`);
  await mongoose.disconnect();
})().catch((e) => { console.error('MIGRATE_FAIL ' + e.message); process.exit(1); });
