const { CREDIT_COSTS } = require('../config/credits.config');
const creditService = require('../services/credit.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Ensures the authenticated user has enough credits for the given generation
 * type before the route handler runs. Must sit after auth.middleware, since
 * it reads req.user.id.
 */
function checkCredits(generationType) {
  const requiredCredits = CREDIT_COSTS[generationType];
  if (!requiredCredits) {
    throw new Error(`Unknown generation type for credit check: ${generationType}`);
  }

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    await creditService.checkSufficientCredits(req.user.id, requiredCredits);
    req.requiredCredits = requiredCredits;
    next();
  });
}

module.exports = checkCredits;
