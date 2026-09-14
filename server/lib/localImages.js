// Local product-image pipeline — single source of truth for uploads,
// permanent-delete purges, AI reads, and the legacy-URL migration script.
// Stores ONLY relative paths (/uploads/YYYY-MM/<uuid>.webp) in MongoDB.
//
// Pipeline (locked decisions): sharp → EXIF rotate → resize inside 1600px
// (no enlarge) → composite server/assets/watermark.png (copied from
// client/public/images/logo.png) at ~16% width, ~55% opacity, 24px inset
// → WebP q80/effort 4 → UPLOAD_DIR (env UPLOADS_DIR or server/public/uploads).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

// NOTE: resolved lazily (function, not const) because server.js loads .env
// via dotenv — modules required before that call would otherwise freeze the
// dev default even when UPLOADS_DIR is configured (the VPS serves
// /var/www/etherstar/uploads, not server/public/uploads).
function getUploadDir() {
  return process.env.UPLOADS_DIR || path.join(__dirname, '..', 'public', 'uploads');
}
const WATERMARK_SRC = path.join(__dirname, '..', 'assets', 'watermark.png');

// DB-facing URL shape + bare filename shape (DELETE contract accepts both).
const LOCAL_IMG_RE = /^\/uploads\/\d{4}-\d{2}\/[A-Za-z0-9-]+\.webp$/;
const LOCAL_FILE_RE = /^\d{4}-\d{2}\/[A-Za-z0-9-]+\.webp$/;

const MAX_DIM = 1600;
const WEBP_QUALITY = 80;
const WATERMARK_SCALE = 0.16;
const WATERMARK_OPACITY = 0.55;
const WATERMARK_INSET = 24;

let watermarkMissingWarned = false;
// Cache the opacity-baked overlay per target width (uploads are 1600-max,
// migration reuses the same sizes — avoids re-encoding the logo per file).
const watermarkCache = new Map();

function ensureUploadDir() {
  const dir = getUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Bake ~55% opacity into the logo: sharp composite has no opacity option,
// so attenuate the alpha channel once per width and cache the PNG buffer.
async function getWatermarkBuffer(mainWidth) {
  const targetW = Math.max(64, Math.round(mainWidth * WATERMARK_SCALE));
  if (watermarkCache.has(targetW)) return watermarkCache.get(targetW);
  if (!fs.existsSync(WATERMARK_SRC)) {
    if (!watermarkMissingWarned) {
      watermarkMissingWarned = true;
      console.warn(
        `localImages: watermark missing at ${WATERMARK_SRC} — saving without overlay`
      );
    }
    return null;
  }
  const resized = await sharp(WATERMARK_SRC)
    .resize({ width: targetW, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = resized;
  for (let i = 3; i < data.length; i += info.channels) {
    data[i] = Math.round(data[i] * WATERMARK_OPACITY);
  }
  const out = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
  watermarkCache.set(targetW, out);
  return out;
}

// Normalize DELETE input: '/uploads/2026-09/uuid.webp' or '2026-09/uuid.webp'
// → '2026-09/uuid.webp'. Returns null when the shape is not ours.
function normalizeFilename(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (LOCAL_IMG_RE.test(s)) return s.replace(/^\/uploads\//, '');
  if (LOCAL_FILE_RE.test(s)) return s;
  return null;
}

// Resolve inside the upload dir, refusing traversal (../, absolute, separators).
function resolveLocalPath(filename) {
  const rel = normalizeFilename(filename);
  if (!rel) return null;
  const dir = getUploadDir();
  const abs = path.resolve(dir, rel);
  const root = path.resolve(dir) + path.sep;
  if (!abs.startsWith(root)) return null;
  return abs;
}

// Core transform: buffer → { buffer (webp), width, height }.
async function transformBuffer(input) {
  const resized = await sharp(input)
    .rotate() // honor EXIF orientation before measuring
    .resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const width = meta.width || MAX_DIM;
  const height = meta.height || MAX_DIM;

  let pipeline = sharp(resized);
  try {
    const overlay = await getWatermarkBuffer(width);
    if (overlay) {
      const wmMeta = await sharp(overlay).metadata();
      const left = Math.max(0, width - (wmMeta.width || 0) - WATERMARK_INSET);
      const top = Math.max(0, height - (wmMeta.height || 0) - WATERMARK_INSET);
      pipeline = pipeline.composite([{ input: overlay, left, top, blend: 'over' }]);
    }
  } catch (e) {
    // Watermark must never fail an upload — save the clean resize instead.
    console.warn(`localImages: watermark composite skipped (${e.message})`);
  }
  const out = await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
  return { buffer: out, width, height };
}

// Save one image buffer → { url, filename }. Used by POST /api/uploads and
// the migration script so both paths produce identical files.
async function saveImageBuffer(input) {
  ensureUploadDir();
  const { buffer } = await transformBuffer(input);
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM sharding
  const filename = `${month}/${crypto.randomUUID()}.webp`;
  const abs = resolveLocalPath(filename);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, buffer);
  return { url: `/uploads/${filename}`, filename };
}

// Delete one local file. Returns true when gone (or never existed),
// false when the reference is not a local upload.
async function deleteLocalFile(filenameOrUrl) {
  const abs = resolveLocalPath(filenameOrUrl);
  if (!abs) return false;
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch (e) {
    if (e && e.code === 'ENOENT') return true; // already gone = desired state
    throw e;
  }
}

module.exports = {
  getUploadDir,
  // Deprecated alias: frozen at first require — prefer getUploadDir(), which
  // reflects process.env.UPLOADS_DIR after dotenv loads. Kept for compat.
  get UPLOAD_DIR() {
    return getUploadDir();
  },
  WATERMARK_SRC,
  LOCAL_IMG_RE,
  LOCAL_FILE_RE,
  MAX_DIM,
  WEBP_QUALITY,
  ensureUploadDir,
  normalizeFilename,
  resolveLocalPath,
  transformBuffer,
  saveImageBuffer,
  deleteLocalFile,
};
