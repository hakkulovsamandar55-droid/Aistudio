const generationService = require('../services/generation.service');
const { REMIX_STYLES, findRemixStyle } = require('../config/remixStyles.config');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const listStyles = asyncHandler(async (req, res) => {
  res.json({ success: true, data: REMIX_STYLES });
});

const remix = asyncHandler(async (req, res) => {
  const { style } = req.body;

  // multer holds the upload in memory, so a request rejected here simply
  // drops the buffer — there is no half-written file to clean up.
  if (!req.file) {
    throw new AppError('An image file is required', 400);
  }
  if (!findRemixStyle(style)) {
    throw new AppError(`Unknown remix style: ${style}`, 400);
  }

  const generation = await generationService.createRemixGeneration(
    req.user.id,
    { buffer: req.file.buffer, contentType: req.file.mimetype },
    style
  );

  res.status(201).json({ success: true, data: generation });
});

module.exports = { listStyles, remix };
