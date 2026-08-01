const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Must run after auth.middleware (needs req.user.id). Re-checks the role
 * against the DB on every request rather than trusting a claim baked into
 * the JWT, so a demoted admin loses access immediately instead of only
 * after their access token expires.
 */
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403);
  }

  next();
});

module.exports = requireAdmin;
