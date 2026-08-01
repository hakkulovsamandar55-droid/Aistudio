const generationService = require('../services/generation.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const MAX_PROMPT_LENGTH = 500;

function assertValidPrompt(prompt) {
  if (!prompt || !prompt.trim()) {
    throw new AppError('Prompt is required', 400);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new AppError(`Prompt must be at most ${MAX_PROMPT_LENGTH} characters`, 400);
  }
}

const generateImage = asyncHandler(async (req, res) => {
  const { prompt, size, quality } = req.body;
  assertValidPrompt(prompt);

  const generation = await generationService.createImageGeneration(req.user.id, prompt.trim(), {
    size,
    quality,
  });

  res.status(201).json({ success: true, data: generation });
});

const generateVideo = asyncHandler(async (req, res) => {
  const { prompt, duration } = req.body;
  assertValidPrompt(prompt);

  const generation = await generationService.createVideoGeneration(req.user.id, prompt.trim(), {
    duration,
  });

  res.status(202).json({
    success: true,
    data: { generationId: generation.id, status: generation.status },
  });
});

const getStatus = asyncHandler(async (req, res) => {
  const generation = await generationService.getGenerationStatus(req.params.id, req.user.id);
  if (!generation) {
    throw new AppError('Generation not found', 404);
  }
  res.json({ success: true, data: generation });
});

module.exports = { generateImage, generateVideo, getStatus };
