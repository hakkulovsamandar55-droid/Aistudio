const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const accountService = require('../services/account.service');
const { NOT_DELETED } = require('../services/generation.service');
const AppError = require('../utils/AppError');

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // toPublicUser derives dailyBonus from the row we already loaded.
  res.json({ success: true, data: authService.toPublicUser(user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw new AppError('Name is required', 400);
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: name.trim() },
  });

  res.json({ success: true, data: authService.toPublicUser(user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await accountService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ success: true, data: { changed: true } });
});

const getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [total, byType, byStatus, favorites, publicCount, spentAgg] = await Promise.all([
    prisma.generation.count({ where: { userId, ...NOT_DELETED } }),
    prisma.generation.groupBy({
      by: ['type'],
      where: { userId, ...NOT_DELETED },
      _count: { _all: true },
    }),
    prisma.generation.groupBy({
      by: ['status'],
      where: { userId, ...NOT_DELETED },
      _count: { _all: true },
    }),
    prisma.generation.count({ where: { userId, isFavorite: true, ...NOT_DELETED } }),
    prisma.generation.count({ where: { userId, isPublic: true, ...NOT_DELETED } }),
    prisma.creditTransaction.aggregate({
      where: { userId, type: { in: ['GENERATION_IMAGE', 'GENERATION_VIDEO'] } },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalGenerations: total,
      byType: Object.fromEntries(byType.map((row) => [row.type, row._count._all])),
      byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
      favorites,
      shared: publicCount,
      // Deduction rows are stored negative; report the spend as a positive number.
      creditsSpent: Math.abs(spentAgg._sum.amount || 0),
    },
  });
});

const getCreditsHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [items, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.creditTransaction.count({ where: { userId: req.user.id } }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getGenerations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, status, search, favorite } = req.query;

  const where = { userId: req.user.id, ...NOT_DELETED };
  if (type === 'IMAGE' || type === 'VIDEO') {
    where.type = type;
  }
  if (['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
    where.status = status;
  }
  if (favorite === 'true') {
    where.isFavorite = true;
  }
  if (search && search.trim()) {
    where.userPrompt = { contains: search.trim(), mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.generation.count({ where }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getReferrals = asyncHandler(async (req, res) => {
  const data = await accountService.getReferralSummary(req.user.id);
  res.json({ success: true, data });
});

const claimDailyBonus = asyncHandler(async (req, res) => {
  const data = await accountService.claimDailyBonus(req.user.id);
  res.json({ success: true, data });
});

module.exports = {
  getMe,
  updateMe,
  changePassword,
  getStats,
  getCreditsHistory,
  getGenerations,
  getReferrals,
  claimDailyBonus,
};
