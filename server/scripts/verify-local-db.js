// Post-migration verifier: proves the self-hosted MongoDB + local /uploads
// stack is healthy after the Atlas → VPS move (or any restore).
//
//   node scripts/verify-local-db.js                  # full check, API at localhost:5001
//   node scripts/verify-local-db.js --api-base https://etherstar.cloud
//   node scripts/verify-local-db.js --allow-cloudinary  # don't fail on leftover hosted URLs
//
// Checks (any failure → non-zero exit + report):
//   1. Authenticated connect + ping  (proves a: DB reachable with MONGO_URI)
//   2. Collection inventory + counts (products must exist and be non-empty)
//   3. Image audit per product       (proves b: every image is /uploads/*.webp
//      or an https fallback; nothing Cloudinary unless --allow-cloudinary;
//      variant photos must be members of images[] per the schema rule)
//   4. Disk presence                 (every local path resolves inside
//      UPLOADS_DIR and exists on disk)
//   5. HTTP sample                   (proves c: up to 5 local images return
//      200 image/webp from the API/static layer; skipped with a warning when
//      the API isn't reachable yet)
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const HTTP_SAMPLE = 5;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { apiBase: null, allowCloudinary: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--allow-cloudinary') out.allowCloudinary = true;
    else if (args[i] === '--api-base' && args[i + 1]) out.apiBase = args[++i];
    else if (args[i].startsWith('--api-base=')) out.apiBase = args[i].slice(11);
  }
  return out;
}

async function main() {
  const { apiBase, allowCloudinary } = parseArgs();
  const failures = [];
  const warnings = [];
  const fail = (m) => failures.push(m);
  const warn = (m) => warnings.push(m);

  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  const safeUri = process.env.MONGO_URI.replace(/:\/\/([^:@/]+):[^@/]+@/, '://$1:****@');
  console.log(`verify: connecting to ${safeUri}`);

  // --- 1. connect + ping -------------------------------------------------
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 8000 });
    await mongoose.connection.db.admin().ping();
    console.log(`verify [1/5] DB ping: OK (host=${mongoose.connection.host})`);
  } catch (e) {
    console.error(`verify [1/5] DB ping: FAILED (${e.message})`);
    process.exit(1);
  }

  // --- 2. inventory ------------------------------------------------------
  const Product = require('../models/Product');
  const cols = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  console.log(`verify [2/5] collections (${cols.length}): ${cols.sort().join(', ')}`);
  const counts = {};
  for (const c of cols) {
    counts[c] = await mongoose.connection.db.collection(c).countDocuments();
  }
  for (const [c, n] of Object.entries(counts).sort()) console.log(`    - ${c}: ${n}`);
  if (!cols.includes('products')) fail('products collection missing');
  else if (counts.products === 0) fail('products collection is empty (expected migrated catalog)');
  if (!cols.includes('categories')) warn('categories collection missing');

  // --- 3. image audit ----------------------------------------------------
  const { LOCAL_IMG_RE } = require('../lib/localImages');
  const products = await Product.find({}).select('slug images variants').lean();
  let local = 0;
  let external = 0;
  let cloudinary = 0;
  const cloudinaryLeftovers = [];
  const distinctLocal = new Set();
  for (const p of products) {
    if (!Array.isArray(p.images) || p.images.length === 0) {
      fail(`product '${p.slug}' has no images`);
      continue;
    }
    for (const src of p.images) {
      if (typeof src !== 'string') {
        fail(`product '${p.slug}' has a non-string image entry`);
        continue;
      }
      if (LOCAL_IMG_RE.test(src)) {
        local += 1;
        distinctLocal.add(src);
      } else if (/res\.cloudinary\.com/.test(src)) {
        cloudinary += 1;
        if (cloudinaryLeftovers.length < 10) cloudinaryLeftovers.push(`${p.slug}: ${src}`);
      } else if (/^https?:\/\//.test(src)) {
        external += 1;
      } else {
        fail(`product '${p.slug}' has an invalid image value: ${src.slice(0, 80)}`);
      }
    }
    for (const v of p.variants || []) {
      if (v.image && !(p.images || []).includes(v.image)) {
        fail(`product '${p.slug}' variant '${v.name || '?'}' photo is not in images[]`);
      }
    }
  }
  console.log(`verify [3/5] image audit over ${products.length} product(s): ${local} local, ${external} external-https, ${cloudinary} cloudinary`);
  if (cloudinary > 0) {
    const msg = `${cloudinary} Cloudinary URL(s) remain — re-run migrate-images-to-local.js`;
    if (allowCloudinary) warn(msg);
    else fail(msg);
    for (const s of cloudinaryLeftovers) console.log(`    ! ${s.slice(0, 100)}`);
  }

  // --- 4. disk presence --------------------------------------------------
  const { resolveLocalPath } = require('../lib/localImages');
  const { UPLOAD_DIR } = require('../lib/localImages');
  let missing = 0;
  for (const src of distinctLocal) {
    const abs = resolveLocalPath(src);
    if (!abs || !fs.existsSync(abs)) {
      if (missing < 10) fail(`file missing on disk: ${src}`);
      missing += 1;
    }
  }
  if (missing > 10) fail(`... plus ${missing - 10} more missing files`);
  console.log(`verify [4/5] disk: ${distinctLocal.size - missing}/${distinctLocal.size} local files present under ${UPLOAD_DIR}`);

  // --- 5. HTTP sample ----------------------------------------------------
  const base = (apiBase || process.env.PUBLIC_API_BASE || `http://127.0.0.1:${process.env.PORT || 5001}`).replace(/\/$/, '');
  const sample = [...distinctLocal].slice(0, HTTP_SAMPLE);
  if (!sample.length) {
    warn('no local images to HTTP-check');
  } else {
    let ok = 0;
    let unreachable = false;
    for (const src of sample) {
      try {
        // 10s cap per image: a hung check must never stall the whole run.
        const r = await fetch(base + src, { signal: AbortSignal.timeout(10000) });
        const ct = r.headers.get('content-type') || '';
        if (r.status === 200 && ct.includes('image/webp')) ok += 1;
        else fail(`GET ${src} → ${r.status} (${ct || 'no content-type'})`);
      } catch (e) {
        // Connection refused = API simply isn't up yet (warn, don't fail);
        // anything else (timeout mid-flight, DNS) is a real failure.
        const code = (e && e.cause && e.cause.code) || e.code;
        if (code === 'ECONNREFUSED') {
          unreachable = true;
          break;
        }
        fail(`GET ${src} errored (${e.name || 'fetch error'})`);
      }
    }
    if (unreachable) {
      warn(`API not reachable at ${base} — start the server, then re-run with --api-base ${base}`);
    } else {
      console.log(`verify [5/5] HTTP: ${ok}/${sample.length} sampled images return 200 image/webp via ${base}`);
    }
  }

  await mongoose.disconnect();
  console.log('----');
  for (const w of warnings) console.log(`WARN: ${w}`);
  if (failures.length) {
    console.log(`FAILED (${failures.length}):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`VERIFY PASSED${warnings.length ? ` (${warnings.length} warning(s))` : ''}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('verify failed:', e.message);
    process.exit(1);
  });
}

module.exports = { main };
