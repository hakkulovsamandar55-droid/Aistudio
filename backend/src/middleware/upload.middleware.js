const multer = require('multer');
const AppError = require('../utils/AppError');

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — generous for a phone photo, small enough to keep cost bounded
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Uploads are held in memory rather than written straight to this server's
 * disk, then handed to the storage layer (S3 in production, disk locally).
 * Writing to local disk here would tie a user's file to one machine: a
 * redeploy wipes it and a second API instance can't see it.
 *
 * The 8MB cap is what makes buffering safe — multer rejects anything larger
 * before it is fully read.
 */
const storage = multer.memoryStorage();

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

module.exports = { handleRemixUpload, MAX_FILE_BYTES, ALLOWED_MIME_TYPES };
