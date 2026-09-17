// Local-only catalog filler: imports ring products from the Mitva supplier
// image archive (D:\1_EtherStar\Mitva) so every diamond shape on the
// Shop-by-Shape homepage has something to show while testing locally.
// Images are the seller's own already-downloaded supplier assets, run
// through the normal saveImageBuffer pipeline (resize/watermark/webp) —
// nothing is fetched from any live third-party site. Descriptions are
// written fresh here, not copied from any external source.
//
// Usage:
//   npm run import-mitva -- --dry-run     # preview only, no writes
//   npm run import-mitva -- --limit=50    # default 50
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { saveImageBuffer } = require('../lib/localImages');
const { DIAMOND_SHAPES, DEFAULT_RING_SIZES } = require('../config/catalog');

const SRC_DIR = 'D:\\1_EtherStar\\Mitva\\Rings';
const IMG_EXT = /\.(png|jpe?g|webp)$/i;

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;
const MAX_IMAGES_PER_PRODUCT = 6;

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (Céleste -> celeste)
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Category leaf inference from the folder/product name.
function inferCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('eternity') || /\bband\b/.test(n)) return 'bands';
  if (n.includes('three-stone') || n.includes('trilogy')) return 'three-stone-rings';
  if (n.includes('halo')) return 'halo-rings';
  if (n.includes('solitaire')) return 'solitaire-rings';
  return 'engagement-rings';
}

// Diamond shapes mentioned in the name, in the order they appear
// (first = primary `shape`). Only DIAMOND_SHAPES enum values match —
// names like "Baguette" or "Kite" aren't a supported filter shape, so
// products without a recognized shape keyword just get shapes: [].
function inferShapes(name) {
  const n = name.toLowerCase();
  const found = [];
  for (const shape of DIAMOND_SHAPES) {
    const re = new RegExp(`\\b${shape.toLowerCase()}\\b`);
    if (re.test(n)) found.push({ shape, at: n.indexOf(shape.toLowerCase()) });
  }
  found.sort((a, b) => a.at - b.at);
  return found.map((f) => f.shape).slice(0, 5);
}

// Rough, consistent weight/carat guesses by product type — good enough for
// the auto-pricing hook to produce a realistic, non-zero price locally.
function inferDetails(category) {
  switch (category) {
    case 'bands':
      return { metalWeightGrams: 3.5, diamondCaratWeight: 1.5 };
    case 'three-stone-rings':
      return { metalWeightGrams: 3, diamondCaratWeight: 1.2 };
    case 'halo-rings':
      return { metalWeightGrams: 3, diamondCaratWeight: 0.9 };
    case 'solitaire-rings':
      return { metalWeightGrams: 2.5, diamondCaratWeight: 0.5 };
    default:
      return { metalWeightGrams: 3, diamondCaratWeight: 0.7 };
  }
}

function describeProduct(name, category, shapes) {
  const shapeText = shapes.length ? `${shapes.join(' & ')}-cut` : 'brilliant';
  const categoryLabel = {
    bands: 'Eternity band',
    'three-stone-rings': 'Three-stone ring',
    'halo-rings': 'Halo setting',
    'solitaire-rings': 'Solitaire setting',
    'engagement-rings': 'Engagement ring',
  }[category] || 'Ring';
  const shortDescription = `${name} — a ${shapeText} certified lab-grown diamond design, handcrafted in premium gold.`;
  const description = [
    `${name}, part of our lab-grown diamond ring collection.`,
    '',
    'Key Features:',
    '',
    `${categoryLabel} styling set with ${shapeText} diamonds.`,
    '',
    'Premium Metal Choices: Yellow, White, or Rose Gold (14K/18K).',
    '',
    'Ethical & Certified 100% lab-grown diamonds, conflict-free.',
  ].join('\n');
  return { shortDescription, description };
}

// Natural sort so "_2.png" sorts before "_10.png".
function naturalSort(a, b) {
  const numA = parseInt((a.match(/(\d+)(?=\.\w+$)/) || [0])[0], 10);
  const numB = parseInt((b.match(/(\d+)(?=\.\w+$)/) || [0])[0], 10);
  return numA - numB;
}

function inferStyleCode(files) {
  for (const f of files) {
    const m = f.match(/^([A-Za-z]+-\d+)/);
    if (m) return m[1];
  }
  return null;
}

async function uniqueSlug(base) {
  let slug = base;
  let i = 2;
  while (await Product.exists({ slug })) {
    slug = `${base}-${i}`;
    i++;
  }
  return slug;
}

async function uniqueStyleCode(base) {
  if (!base) return null;
  let code = base;
  let i = 2;
  while (await Product.exists({ styleCode: code })) {
    code = `${base}-${i}`;
    i++;
  }
  return code;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const folders = fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .slice(0, LIMIT);

  console.log(`Found ${folders.length} product folders (limit=${LIMIT}, dry=${dry})`);

  const shapeCounts = {};
  let created = 0;
  let skipped = 0;

  for (const folderName of folders) {
    const folderPath = path.join(SRC_DIR, folderName);
    const files = fs
      .readdirSync(folderPath)
      .filter((f) => IMG_EXT.test(f))
      .sort(naturalSort)
      .slice(0, MAX_IMAGES_PER_PRODUCT);

    if (files.length === 0) {
      console.log(`SKIP  ${folderName} (no images)`);
      skipped++;
      continue;
    }

    const category = inferCategory(folderName);
    const shapes = inferShapes(folderName);
    const { metalWeightGrams, diamondCaratWeight } = inferDetails(category);
    const { shortDescription, description } = describeProduct(folderName, category, shapes);
    shapes.forEach((s) => { shapeCounts[s] = (shapeCounts[s] || 0) + 1; });

    if (dry) {
      console.log(`PLAN  ${folderName} -> category=${category} shapes=[${shapes.join(',')}] images=${files.length}`);
      created++;
      continue;
    }

    try {
      const slug = await uniqueSlug(slugify(folderName));
      const styleCode = await uniqueStyleCode(inferStyleCode(files));

      const images = [];
      for (const f of files) {
        const buf = fs.readFileSync(path.join(folderPath, f));
        const { url } = await saveImageBuffer(buf);
        images.push(url);
      }

      const doc = new Product({
        name: folderName,
        slug,
        styleCode: styleCode || undefined,
        shape: shapes[0] || null,
        shapes,
        diamondColors: ['G'],
        clarity: ['VS2'],
        autoPriced: true,
        description,
        shortDescription,
        category,
        images,
        variants: [{ name: 'Gold', material: 'Gold', color: '#FFD700', price: 1, inStock: true }],
        status: 'active',
        inStock: true,
        stockQty: 10,
        featured: false,
        sizes: DEFAULT_RING_SIZES,
        defaultSize: null,
        details: { metalWeightGrams, diamondCaratWeight, sideStoneCertified: false, deliveryDays: 30 },
      });
      await doc.save();
      console.log(`CREATE ${folderName} -> ${category} [${shapes.join(',')}] $${doc.price} (${images.length} imgs)`);
      created++;
    } catch (e) {
      console.error(`FAIL  ${folderName}: ${e.message}`);
      skipped++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Created: ${created}, Skipped: ${skipped}`);
  console.log('Shape coverage:', shapeCounts);
  const missing = DIAMOND_SHAPES.filter((s) => !shapeCounts[s]);
  if (missing.length) console.log('No product tagged for:', missing.join(', '));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('IMPORT_FAIL', e);
  process.exit(1);
});
