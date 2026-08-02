const axios = require('axios');

const generationService = require('../services/generation.service');
const promptEnhancer = require('../services/promptEnhancer.service');
const { getStyles, findStyle } = require('../config/styles.config');
const { CREDIT_COSTS } = require('../config/credits.config');
const { listTiers, isValidTier, resolveTier } = require('../services/ai-gateway/videoTiers');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const MAX_PROMPT_LENGTH = 500;

function assertValidPrompt(prompt) {
  if (!prompt || !prompt.trim()) {
    throw new AppError('Prompt is required', 400);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new AppError(`Prompt must be at most ${MAX_PROMPT_LENGTH} characters`, 400);
  }
}

function normalizeStyle(type, styleId) {
  if (!styleId) return undefined;
  const style = findStyle(type, styleId);
  if (!style) {
    throw new AppError(`Unknown style: ${styleId}`, 400);
  }
  return style.id;
}

const listStyles = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      image: getStyles('IMAGE'),
      video: getStyles('VIDEO'),
      costs: CREDIT_COSTS,
      // Quality tiers carry their own prices; `costs.VIDEO` remains the
      // default-tier price so existing clients keep working.
      videoTiers: listTiers(),
    },
  });
});

/**
 * Turns a short idea into a fuller, provider-ready prompt without spending a
 * credit — this is the "Promptni professional qil" step in the create flow,
 * a preview the user can still edit before anything is generated, not a
 * generation itself. Deliberately outside checkCredits/checkPlanLimit for
 * that reason; generateLimiter still applies below since it calls a real
 * OpenAI request and must not become a free way to hammer that API.
 */
const enhancePrompt = asyncHandler(async (req, res) => {
  const { prompt, type } = req.body;
  assertValidPrompt(prompt);

  const enhancer = type === 'IMAGE' ? promptEnhancer.enhanceImagePrompt : promptEnhancer.enhanceVideoPrompt;
  const { enhancedPrompt } = await enhancer(prompt.trim());

  res.json({ success: true, data: { originalPrompt: prompt.trim(), enhancedPrompt } });
});

const generateImage = asyncHandler(async (req, res) => {
  const { prompt, size, quality, style } = req.body;
  assertValidPrompt(prompt);

  const generation = await generationService.createImageGeneration(req.user.id, prompt.trim(), {
    size,
    quality,
    style: normalizeStyle('IMAGE', style),
  });

  res.status(201).json({ success: true, data: generation });
});

const generateVideo = asyncHandler(async (req, res) => {
  const { prompt, duration, style, quality } = req.body;
  assertValidPrompt(prompt);

  if (quality !== undefined && !isValidTier(quality)) {
    throw new AppError(`Unknown quality tier: ${quality}`, 400);
  }

  if (duration !== undefined) {
    const tier = resolveTier(quality);
    if (Number(duration) > tier.maxDuration) {
      throw new AppError(
        `${tier.label} sifat darajasida video uzunligi ${tier.maxDuration}s dan oshmasligi kerak`,
        400
      );
    }
  }

  const generation = await generationService.createVideoGeneration(req.user.id, prompt.trim(), {
    duration,
    style: normalizeStyle('VIDEO', style),
    quality,
  });

  res.status(202).json({
    success: true,
    data: {
      generationId: generation.id,
      status: generation.status,
      quality: resolveTier(quality).id,
      credits: req.requiredCredits,
    },
  });
});

const getStatus = asyncHandler(async (req, res) => {
  const generation = await generationService.getGenerationStatus(req.params.id, req.user.id);
  if (!generation) {
    throw new AppError('Generation not found', 404);
  }
  res.json({ success: true, data: generation });
});

const setFavorite = asyncHandler(async (req, res) => {
  const { isFavorite } = req.body;
  if (typeof isFavorite !== 'boolean') {
    throw new AppError('isFavorite must be a boolean', 400);
  }
  const generation = await generationService.setFavorite(req.params.id, req.user.id, isFavorite);
  res.json({ success: true, data: generation });
});

const setPublic = asyncHandler(async (req, res) => {
  const { isPublic } = req.body;
  if (typeof isPublic !== 'boolean') {
    throw new AppError('isPublic must be a boolean', 400);
  }
  const generation = await generationService.setPublic(req.params.id, req.user.id, isPublic);
  res.json({ success: true, data: generation });
});

const remove = asyncHandler(async (req, res) => {
  await generationService.deleteGeneration(req.params.id, req.user.id);
  res.json({ success: true, data: { id: req.params.id, deleted: true } });
});

/**
 * Streams the result back through our own origin with a Content-Disposition
 * header. Without this, the frontend's `<a download>` is silently ignored for
 * cross-origin provider URLs and the file just opens in a new tab instead of
 * downloading.
 */
const download = asyncHandler(async (req, res) => {
  const generation = await generationService.getOwnedGeneration(req.params.id, req.user.id);

  if (generation.status !== 'COMPLETED' || !generation.resultUrl) {
    throw new AppError('This generation has no downloadable result', 400);
  }

  const extension = generation.type === 'VIDEO' ? 'mp4' : 'png';
  const filename = `ai-studio-${generation.id}.${extension}`;
  const disposition = `attachment; filename="${filename}"`;

  // Providers may hand back either a hosted URL or an inline base64 payload.
  if (generation.resultUrl.startsWith('data:')) {
    const [meta, base64] = generation.resultUrl.split(',');
    const mime = meta.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Type', mime);
    res.send(Buffer.from(base64, 'base64'));
    return;
  }

  if (!/^https?:\/\//i.test(generation.resultUrl)) {
    throw new AppError('Unsupported result URL', 400);
  }

  let upstream;
  try {
    upstream = await axios.get(generation.resultUrl, { responseType: 'stream', timeout: 30000 });
  } catch (err) {
    // The provider's CDN is the thing that failed, not this request — report
    // it as a bad gateway so the client can distinguish it from a real 500.
    throw new AppError(`Could not fetch the generated file from the provider (${err.message})`, 502);
  }

  // Headers are only committed once upstream has actually responded, so a
  // failed fetch above still gets a clean JSON error instead of a half-written
  // attachment response.
  res.setHeader('Content-Disposition', disposition);
  res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/octet-stream');
  if (upstream.headers['content-length']) {
    res.setHeader('Content-Length', upstream.headers['content-length']);
  }

  // Once piping starts the status line is already sent, so a mid-stream
  // failure can only be handled by tearing the response down.
  upstream.data.on('error', (err) => {
    logger.error(`Download stream failed for generation ${generation.id}`, err.message);
    res.destroy(err);
  });

  upstream.data.pipe(res);
});

module.exports = {
  listStyles,
  enhancePrompt,
  generateImage,
  generateVideo,
  getStatus,
  setFavorite,
  setPublic,
  remove,
  download,
};
