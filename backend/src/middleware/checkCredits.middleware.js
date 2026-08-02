const { CREDIT_COSTS } = require('../config/credits.config');
const { creditCostForQuality } = require('../services/ai-gateway/videoTiers');
const creditService = require('../services/credit.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Ensures the authenticated user has enough credits for the given generation
 * type before the route handler runs. Must sit after auth.middleware, since
 * it reads req.user.id.
 *
 * Video is priced per quality tier, so its cost is resolved per request from
 * `req.body.quality` rather than being fixed when the route is registered.
 * The resolved figure is published on `req.requiredCredits` so the handler
 * charges exactly what was checked.
 */
function checkCredits(generationType) {
  // Non-video types are priced once at startup, which also validates the
  // type name at boot rather than on the first request.
  if (generationType !== 'VIDEO' && !CREDIT_COSTS[generationType]) {
    throw new Error(`Unknown generation type for credit check: ${generationType}`);
  }

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const requiredCredits =
      generationType === 'VIDEO'
        ? creditCostForQuality(req.body?.quality)
        : CREDIT_COSTS[generationType];

    await creditService.checkSufficientCredits(req.user.id, requiredCredits);
    req.requiredCredits = requiredCredits;
    next();
  });
}

module.exports = checkCredits;
