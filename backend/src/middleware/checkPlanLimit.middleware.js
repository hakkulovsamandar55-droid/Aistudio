const planService = require('../services/plan.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Enforces the free tier's daily cap for a module.
 *
 * Runs *before* the credit check so a free user who is out of quota gets a
 * clear "come back tomorrow or upgrade" instead of a confusing credit error.
 * Paid plans have no daily cap and pass straight through.
 */
function checkPlanLimit(moduleId) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const status = await planService.checkDailyLimit(req.user.id, moduleId);

    if (!status.allowed) {
      throw new AppError(
        `Bepul tarifda kuniga ${status.limit} ta ${moduleId.toLowerCase()} yaratish mumkin. ` +
          'Ertaga qayta urinib ko\'ring yoki Pro tarifga o\'ting.',
        429
      );
    }

    req.planStatus = status;
    next();
  });
}

module.exports = checkPlanLimit;
