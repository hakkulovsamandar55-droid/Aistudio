const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const REMIX_DIR = path.join(UPLOAD_ROOT, 'remix');

fs.mkdirSync(REMIX_DIR, { recursive: true });

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — generous for a phone photo, small enough to keep disk/cost bounded
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSION_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, REMIX_DIR),
  filename: (req, file, cb) => {
    const ext = EXTENSION_BY_MIME[file.mimetype] || path.extname(file.originalname) || '';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError('Only JPEG, PNG or WEBP images are accepted', 400));
    return;
  }
  cb(null, true);
}

const uploadRemixImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
}).single('image');

/**
 * Wraps multer so its errors (wrong field name, oversized file, disallowed
 * type) come back as the app's standard JSON error shape instead of an
 * unhandled exception or multer's own format.
 */
function handleRemixUpload(req, res, next) {
  uploadRemixImage(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(`Image must be smaller than ${MAX_FILE_BYTES / (1024 * 1024)}MB`, 400));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    }

    return next(err);
  });
}

module.exports = { handleRemixUpload, UPLOAD_ROOT, REMIX_DIR, MAX_FILE_BYTES };
