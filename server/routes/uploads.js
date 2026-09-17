const express = require('express');
const multer = require('multer');
const { authRequired, requireAdmin } = require('../middleware/auth');
const { saveImageBuffer, deleteLocalFile, normalizeFilename } = require('../lib/localImages');

const router = express.Router();

const MAX_FILES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    const err = new Error('Only image files are allowed');
    err.status = 400;
    cb(err);
  },
});

// POST /api/uploads — multipart field `images` (max 8, 5MB each)
// → { files: [{ url: '/uploads/YYYY-MM/<uuid>.webp', filename }] }
// Images are resized (1600px max), watermarked, and stored as WebP q80.
// Store ONLY `url` in Product.images[].
router.post('/', authRequired, requireAdmin, upload.array('images', MAX_FILES), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'No image files received (field: images)' });
    const out = [];
    for (const f of req.files) {
      try {
        out.push(await saveImageBuffer(f.buffer));
      } catch (e) {
        // fs/mkdir/write failures (disk full, permission denied, missing
        // dir) always set `syscall` — sharp decode errors never do. Keep
        // those distinct so a server/infra problem doesn't get reported to
        // the admin as "your file is a bad JPG/PNG/WebP".
        if (typeof e.syscall === 'string') {
          console.error(`uploads: failed to save '${f.originalname || 'upload'}':`, e);
          throw Object.assign(new Error('Server error saving image — please try again shortly'), { status: 500, cause: e });
        }
        e.status = e.status || 400;
        throw Object.assign(new Error(`Could not process image '${f.originalname || 'upload'}' — use JPG/PNG/WebP`), { status: 400, cause: e });
      }
    }
    res.status(201).json({ files: out });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/uploads — { filename } (or { url }) frees disk when an image
// is removed from the form. Accepts ONLY our YYYY-MM/<uuid>.webp shape —
// anything else (paths, absolute, ../) is rejected before touching fs.
router.delete('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { filename, url } = req.body || {};
    const ref = filename || url;
    if (!ref || typeof ref !== 'string')
      return res.status(400).json({ message: 'filename required' });
    if (!normalizeFilename(ref))
      return res.status(400).json({ message: 'Unknown image reference' });
    await deleteLocalFile(ref);
    res.json({ message: 'Deleted' });
  } catch (e) {
    next(e);
  }
});

// Multer errors → 400 with a clean message
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' || err.status === 400)) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT'
          ? `Upload max ${MAX_FILES} images at a time`
          : err.message || 'Invalid upload';
    return res.status(400).json({ message: msg });
  }
  throw err;
});

module.exports = router;
