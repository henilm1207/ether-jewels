const express = require('express');
const multer = require('multer');
const { authRequired, requireAdmin } = require('../middleware/auth');

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

function cloudinaryClient() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

function uploadBuffer(cloudinary, buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder || 'ether-jewels/products', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /api/uploads — multipart field `images` (max 8, 5MB each) → [{url, publicId}]
router.post('/', authRequired, requireAdmin, upload.array('images', MAX_FILES), async (req, res, next) => {
  try {
    const cloudinary = cloudinaryClient();
    if (!cloudinary) {
      return res.status(503).json({
        message: 'Image uploads not configured — set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET, or paste image URLs instead',
      });
    }
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'No image files received (field: images)' });
    const out = [];
    for (const f of req.files) {
      const r = await uploadBuffer(cloudinary, f.buffer);
      out.push({ url: r.secure_url, publicId: r.public_id });
    }
    res.status(201).json({ files: out });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/uploads — { publicId } frees storage when an image is removed
router.delete('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const cloudinary = cloudinaryClient();
    if (!cloudinary) return res.status(503).json({ message: 'Image uploads not configured' });
    const { publicId } = req.body || {};
    if (!publicId || typeof publicId !== 'string')
      return res.status(400).json({ message: 'publicId required' });
    // Exact allowlist match — never a prefix check: a crafted id must not
    // reach the destroy call for an asset outside our folder.
    if (!/^ether-jewels\/[A-Za-z0-9/_-]+$/.test(publicId))
      return res.status(400).json({ message: 'Unknown image reference' });
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
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
