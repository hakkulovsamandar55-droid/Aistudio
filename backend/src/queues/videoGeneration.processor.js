const logger = require('../utils/logger');

/**
 * The unit of work a video job performs. Kept separate from the queue module
 * so the worker process, the inline fallback and the tests all drive the same
 * code path, and so requiring the queue never drags the whole generation
 * service (and its provider stack) into the API process.
 *
 * `finalAttempt` decides who owns the failure: intermediate attempts just
 * rethrow so BullMQ can retry, and only the last one marks the generation
 * FAILED and refunds. Otherwise a user would watch a generation flip to
 * FAILED and then silently come back to life on the next retry.
 */
async function runVideoGenerationJob(payload, { finalAttempt = true } = {}) {
  // Required lazily: generation.service requires the queue to enqueue work,
  // so importing it at module load would close the cycle.
  const generationService = require('../services/generation.service');

  try {
    await generationService.processVideoGeneration(payload);
  } catch (err) {
    if (finalAttempt) {
      await generationService.failVideoGeneration(payload.generationId, err.message);
    } else {
      logger.warn(
        `Video generation ${payload.generationId} attempt failed, will retry: ${err.message}`
      );
    }
    throw err;
  }
}

module.exports = { runVideoGenerationJob };
