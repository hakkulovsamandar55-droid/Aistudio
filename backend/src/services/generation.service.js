const prisma = require('../config/db');
const { CREDIT_COSTS } = require('../config/credits.config');
const creditService = require('./credit.service');
const promptEnhancer = require('./promptEnhancer.service');
const { imageGateway, videoGateway } = require('./ai-gateway');
const logger = require('../utils/logger');

async function createImageGeneration(userId, userPrompt, options = {}) {
  const requiredCredits = CREDIT_COSTS.IMAGE;
  await creditService.checkSufficientCredits(userId, requiredCredits);

  let generation = await prisma.generation.create({
    data: {
      userId,
      type: 'IMAGE',
      userPrompt,
      status: 'PENDING',
      provider: process.env.IMAGE_PROVIDER || 'mock',
    },
  });

  try {
    const { enhancedPrompt } = await promptEnhancer.enhanceImagePrompt(userPrompt);

    generation = await prisma.generation.update({
      where: { id: generation.id },
      data: { enhancedPrompt, status: 'PROCESSING' },
    });

    const { url, provider } = await imageGateway.generateImage(enhancedPrompt, options);

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

    await prisma.generation.update({
      where: { id: generationId },
      data: { enhancedPrompt },
    });

    const { url, provider } = await videoGateway.generateVideo(enhancedPrompt, options);

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
    where: { id: generationId, userId },
  });
}

module.exports = { createImageGeneration, createVideoGeneration, getGenerationStatus };
