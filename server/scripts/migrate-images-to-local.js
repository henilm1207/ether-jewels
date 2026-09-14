// One-shot migration: hosted image URLs (Cloudinary res.cloudinary.com and
// any other external https gallery URLs) → local watermarked WebP uploads.
//
//   node scripts/migrate-images-to-local.js --dry-run   # report only
//   node scripts/migrate-images-to-local.js             # download + rewrite
//   node scripts/migrate-images-to-local.js --limit 5   # migrate first N products
//
// Each downloaded image runs through the SAME pipeline as POST /api/uploads
// (sharp 1600px max, baked watermark, WebP q80 — see lib/localImages.js), so
// migrated files are byte-identical in treatment to new uploads. The DB keeps
// ONLY the relative path (/uploads/YYYY-MM/<uuid>.webp); variant photos that
// pointed at the old URL are remapped to the new path.
//
// Safety: writes a JSON backup (product _id → old images/variant images)
// before touching anything; failures keep the old URL so the storefront keeps
// rendering via the https paste-URL fallback. Run against a prod backup first.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const BACKUP_FILE = path.join(__dirname, '..', 'image-migration-backup.json');
const FETCH_TIMEOUT_MS = 15000;
const MAX_BYTES = 5 * 1024 * 1024;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: false, limit: 0 };
  for (const a of args) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--limit=')) out.limit = Math.max(0, parseInt(a.slice(8), 10) || 0);
    else if (a.startsWith('--limit') && args[args.indexOf(a) + 1]) {
      out.limit = Math.max(0, parseInt(args[args.indexOf(a) + 1], 10) || 0);
    }
  }
  return out;
}

async function downloadImage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (type && !type.startsWith('image/')) throw new Error(`not an image (${type})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('empty response');
    if (buf.length > MAX_BYTES) throw new Error('exceeds 5MB');
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const { dryRun, limit } = parseArgs();
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });

  const { saveImageBuffer, LOCAL_IMG_RE } = require('../lib/localImages');
  const Product = require('../models/Product');

  const query = {
    $or: [
      { images: { $elemMatch: { $regex: 'res\\.cloudinary\\.com' } } },
      { images: { $elemMatch: { $regex: '^https?://' } } },
    ],
  };
  // Only products that still have at least one non-local image.
  const all = await Product.find(query);
  const targets = all.filter((p) =>
    (p.images || []).some((u) => typeof u === 'string' && !LOCAL_IMG_RE.test(u))
  );
  const list = limit > 0 ? targets.slice(0, limit) : targets;
  console.log(
    `Found ${targets.length} product(s) with hosted images` +
      (limit > 0 ? ` (processing first ${list.length})` : '') +
      (dryRun ? ' — DRY RUN, no changes' : '')
  );

  const backup = [];
  let productsMigrated = 0;
  let imagesMigrated = 0;
  const failed = [];

  for (const p of list) {
    const urlMap = new Map(); // old URL → new /uploads path (dedupe repeats)
    const newImages = [];
    for (const src of p.images || []) {
      if (typeof src !== 'string' || LOCAL_IMG_RE.test(src)) {
        newImages.push(src);
        continue;
      }
      if (urlMap.has(src)) {
        newImages.push(urlMap.get(src));
        continue;
      }
      try {
        const buf = await downloadImage(src);
        if (dryRun) {
          newImages.push(src);
          console.log(`  [dry-run] ${p.slug}: would migrate ${src.slice(0, 80)}`);
          continue;
        }
        const { url } = await saveImageBuffer(buf);
        urlMap.set(src, url);
        newImages.push(url);
        imagesMigrated += 1;
        console.log(`  ${p.slug}: ${src.slice(0, 60)}… → ${url}`);
      } catch (e) {
        failed.push({ product: p.slug, url: src, error: e.message });
        newImages.push(src); // keep old URL — storefront fallback still renders it
        console.warn(`  ${p.slug}: FAILED ${src.slice(0, 80)} (${e.message})`);
      }
    }
    if (dryRun) continue;
    if (urlMap.size === 0) continue;

    backup.push({
      productId: String(p._id),
      slug: p.slug,
      images: p.images,
      variantImages: (p.variants || []).map((v) => v.image || ''),
    });
    p.images = newImages;
    for (const v of p.variants || []) {
      if (v.image && urlMap.has(v.image)) v.image = urlMap.get(v.image);
    }
    await p.save();
    productsMigrated += 1;
  }

  if (!dryRun && backup.length) {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
    console.log(`Backup written: ${BACKUP_FILE} (${backup.length} product(s))`);
  }
  console.log(
    dryRun
      ? 'Dry run complete — no files written, no DB changes.'
      : `Done: ${productsMigrated} product(s), ${imagesMigrated} image(s) migrated, ${failed.length} failed.`
  );
  if (failed.length) {
    console.log('Failures (old URLs kept):');
    for (const f of failed) console.log(`  - ${f.product}: ${f.url} (${f.error})`);
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
  });
}

module.exports = { main };
