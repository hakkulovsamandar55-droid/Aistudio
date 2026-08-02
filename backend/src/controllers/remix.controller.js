const fs = require('fs');
const generationService = require('../services/generation.service');
const { REMIX_STYLES, findRemixStyle } = require('../config/remixStyles.config');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const listStyles = asyncHandler(async (req, res) => {
  res.json({ success: true, data: REMIX_STYLES });
});

const remix = asyncHandler(async (req, res) => {
  const { style } = req.body;

  // multer has already written the file to disk by the time this runs; any
  // validation failure below must clean it up so a rejected request doesn't
  // leak a file onto disk.
  const cleanupAndFail = (message, statusCode) => {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    throw new AppError(message, statusCode);
  };

  if (!req.file) {
    cleanupAndFail('An image file is required', 400);
  }
  if (!findRemixStyle(style)) {
    cleanupAndFail(`Unknown remix style: ${style}`, 400);
  }

  const publicUrl = `${req.protocol}://${req.get('host')}/uploads/remix/${req.file.filename}`;

  const generation = await generationService.createRemixGeneration(
    req.user.id,
    { path: req.file.path, url: publicUrl },
    style
  );

  res.status(201).json({ success: true, data: generation });
});

module.exports = { listStyles, remix };
