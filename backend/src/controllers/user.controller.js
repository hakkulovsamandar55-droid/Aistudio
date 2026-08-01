const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
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
  const { type } = req.query;

  const where = { userId: req.user.id };
  if (type === 'IMAGE' || type === 'VIDEO') {
    where.type = type;
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

module.exports = { getMe, updateMe, getCreditsHistory, getGenerations };
