const prisma = require('../config/db');
const { CREDIT_COSTS } = require('../config/credits.config');
const { applyStyle } = require('../config/styles.config');
const creditService = require('./credit.service');
const promptEnhancer = require('./promptEnhancer.service');
const { imageGateway, videoGateway } = require('./ai-gateway');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// Soft-deleted rows stay in the table (they're referenced by credit history)
// but must never surface in any user-facing listing.
const NOT_DELETED = { deletedAt: null };

async function createImageGeneration(userId, userPrompt, options = {}) {
  const requiredCredits = CREDIT_COSTS.IMAGE;
  await creditService.checkSufficientCredits(userId, requiredCredits);

  const { style } = options;

  let generation = await prisma.generation.create({
    data: {
      userId,
      type: 'IMAGE',
      userPrompt,
      style: style || null,
      status: 'PENDING',
      provider: process.env.IMAGE_PROVIDER || 'mock',
    },
  });

  try {
    const { enhancedPrompt } = await promptEnhancer.enhanceImagePrompt(userPrompt);
    const styledPrompt = applyStyle(enhancedPrompt, 'IMAGE', style);

    generation = await prisma.generation.update({
      where: { id: generation.id },
      data: { enhancedPrompt: styledPrompt, status: 'PROCESSING' },
    });

    const { url, provider } = await imageGateway.generateImage(styledPrompt, options);

    generation = await prisma.generation.update({
      where: { id: generation.id },
      data: { status: 'COMPLETED', resultUrl: url, provider, creditsUsed: requiredCredits },
    });

    // Credits are only spent once generation actually succeeds, so a failed
    // request never costs the user anything.
    await creditService.deductCredits(
      userId,
      requiredCredits,
      'GENERATION_IMAGE',
      `Image generation: "${userPrompt.slice(0, 60)}"`
    );

    return generation;
  } catch (err) {
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: 'FAILED', errorMessage: err.message },
    });
    throw err;
  }
}

async function createVideoGeneration(userId, userPrompt, options = {}) {
  const requiredCredits = CREDIT_COSTS.VIDEO;
  await creditService.checkSufficientCredits(userId, requiredCredits);

  const generation = await prisma.generation.create({
    data: {
      userId,
      type: 'VIDEO',
      userPrompt,
      style: options.style || null,
      status: 'PROCESSING',
      provider: process.env.VIDEO_PROVIDER || 'mock',
    },
  });

  // Video generation can take minutes, so we return immediately with the
  // generation id and let the caller poll GET /api/generate/:id/status.
  // This "fire and forget" pattern is a placeholder for a real job queue
  // (Bull/BullMQ + Redis) — the function signatures already match what that
  // migration would need: a self-contained async unit of work keyed by
  // generation.id, with no return value the caller depends on.
  processVideoGeneration(generation.id, userId, userPrompt, requiredCredits, options).catch((err) => {
    logger.error(`Unhandled error processing video generation ${generation.id}`, err);
  });

  return generation;
}

async function processVideoGeneration(generationId, userId, userPrompt, requiredCredits, options) {
  try {
    const { enhancedPrompt } = await promptEnhancer.enhanceVideoPrompt(userPrompt);
    const styledPrompt = applyStyle(enhancedPrompt, 'VIDEO', options.style);

    await prisma.generation.update({
      where: { id: generationId },
      data: { enhancedPrompt: styledPrompt },
    });

    const { url, provider } = await videoGateway.generateVideo(styledPrompt, options);

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: 'COMPLETED', resultUrl: url, provider, creditsUsed: requiredCredits },
    });

    // Same rule as images: video is expensive, so credits are only deducted
    // once the generation has actually succeeded.
    await creditService.deductCredits(
      userId,
      requiredCredits,
      'GENERATION_VIDEO',
      `Video generation: "${userPrompt.slice(0, 60)}"`
    );
  } catch (err) {
    logger.error(`Video generation ${generationId} failed`, err.message);
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: 'FAILED', errorMessage: err.message },
    });
  }
}

async function getGenerationStatus(generationId, userId) {
  return prisma.generation.findFirst({
    where: { id: generationId, userId, ...NOT_DELETED },
  });
}

/** Loads a generation the given user owns, or throws 404. */
async function getOwnedGeneration(generationId, userId) {
  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId, ...NOT_DELETED },
  });
  if (!generation) {
    throw new AppError('Generation not found', 404);
  }
  return generation;
}

async function setFavorite(generationId, userId, isFavorite) {
  await getOwnedGeneration(generationId, userId);
  return prisma.generation.update({
    where: { id: generationId },
    data: { isFavorite },
  });
}

async function setPublic(generationId, userId, isPublic) {
  const generation = await getOwnedGeneration(generationId, userId);

  // Only a finished result is worth showing in the gallery — sharing a
  // pending or failed generation would just publish an empty card.
  if (isPublic && generation.status !== 'COMPLETED') {
    throw new AppError('Only completed generations can be shared publicly', 400);
  }

  return prisma.generation.update({
    where: { id: generationId },
    data: { isPublic },
  });
}

async function deleteGeneration(generationId, userId) {
  await getOwnedGeneration(generationId, userId);
  // Soft delete: the credit transaction history references this generation,
  // and admins still need the audit trail.
  return prisma.generation.update({
    where: { id: generationId },
    data: { deletedAt: new Date(), isPublic: false },
  });
}

async function listPublicGenerations({ page = 1, limit = 24, type }) {
  const where = {
    isPublic: true,
    status: 'COMPLETED',
    ...NOT_DELETED,
  };
  if (type === 'IMAGE' || type === 'VIDEO') {
    where.type = type;
  }

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      // Deliberately narrow: the gallery is unauthenticated, so it exposes
      // only the creator's display name — never their email or the raw
      // enhanced prompt.
      select: {
        id: true,
        type: true,
        userPrompt: true,
        style: true,
        resultUrl: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.generation.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

module.exports = {
  NOT_DELETED,
  createImageGeneration,
  createVideoGeneration,
  getGenerationStatus,
  getOwnedGeneration,
  setFavorite,
  setPublic,
  deleteGeneration,
  listPublicGenerations,
};
