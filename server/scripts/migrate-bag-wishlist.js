// One-shot migration: embedded User.cart[] / User.wishlist[] ->
// standalone Bag / Wishlist collections (one doc per user).
//
//   node scripts/migrate-bag-wishlist.js --dry-run   # print what would move
//   node scripts/migrate-bag-wishlist.js             # backup + migrate
//   node scripts/migrate-bag-wishlist.js --rollback  # delete migrated docs
//                                                    # (User fields untouched)
//
// The script NEVER modifies User documents, so rollback is simply deleting
// the Bag/Wishlist docs listed in the backup file. Run against a prod backup
// first. Requires MONGO_URI (+ JWT_SECRET only for server boot, not here).
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const BACKUP_FILE = path.join(__dirname, '..', 'bag-wishlist-migration-backup.json');

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const rollback = args.has('--rollback');

  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });

  if (rollback) {
    if (!fs.existsSync(BACKUP_FILE)) throw new Error(`backup not found: ${BACKUP_FILE}`);
    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    const ids = backup.map((b) => b.userId).filter(mongoose.isValidObjectId);
    if (!dryRun) {
      const Bag = require('../models/Bag');
      const Wishlist = require('../models/Wishlist');
      const bagRes = await Bag.deleteMany({ user: { $in: ids } });
      const wishRes = await Wishlist.deleteMany({ user: { $in: ids } });
      console.log(`rollback: deleted ${bagRes.deletedCount} bag(s), ${wishRes.deletedCount} wishlist(s)`);
    } else {
      console.log(`rollback dry-run: would delete docs for ${ids.length} user(s)`);
    }
    await mongoose.disconnect();
    return;
  }

  // Raw collection read (not the User model): works before AND after the
  // embedded cart/wishlist fields are removed from the schema. The .0
  // $exists clauses match non-empty arrays only ($ne: [] also matches
  // documents where the field is missing entirely).
  const users = await mongoose.connection.db
    .collection('users')
    .find(
      { $or: [{ 'cart.0': { $exists: true } }, { 'wishlist.0': { $exists: true } }] },
      { projection: { cart: 1, wishlist: 1 } }
    )
    .toArray();
  console.log(`users with cart/wishlist data: ${users.length}`);

  const backup = users.map((u) => ({
    userId: String(u._id),
    cart: u.cart || [],
    wishlist: (u.wishlist || []).map(String),
  }));

  if (dryRun) {
    const lines = backup.reduce((n, b) => n + b.cart.length, 0);
    const favs = backup.reduce((n, b) => n + b.wishlist.length, 0);
    console.log(`dry-run: would create ${backup.length} bag doc(s) (${lines} line(s)) and ${backup.length} wishlist doc(s) (${favs} id(s))`);
    await mongoose.disconnect();
    return;
  }

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
  console.log(`backup written: ${BACKUP_FILE}`);

  const Bag = require('../models/Bag');
  const Wishlist = require('../models/Wishlist');
  let bags = 0;
  let wishes = 0;
  for (const b of backup) {
    const lines = (b.cart || []).filter(
      (l) => l && typeof l.key === 'string' && mongoose.isValidObjectId(l.product)
    );
    // Upsert even when empty: keeps the one-doc-per-user invariant uniform.
    await Bag.updateOne(
      { user: b.userId },
      { $setOnInsert: { user: b.userId }, $set: { items: lines.slice(0, 20), savedForLater: [] } },
      { upsert: true }
    );
    bags += 1;
    const ids = [...new Set((b.wishlist || []).filter(mongoose.isValidObjectId))].slice(0, 100);
    await Wishlist.updateOne(
      { user: b.userId },
      {
        $setOnInsert: { user: b.userId },
        $set: { items: ids.map((id) => ({ product: id, addedAt: new Date() })) },
      },
      { upsert: true }
    );
    wishes += 1;
  }
  console.log(`migrated: ${bags} bag(s), ${wishes} wishlist(s). User documents untouched.`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(`migration failed: ${e.message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
