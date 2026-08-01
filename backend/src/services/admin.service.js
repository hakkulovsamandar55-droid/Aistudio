const prisma = require('../config/db');
const AppError = require('../utils/AppError');

async function getStats() {
  const [
    totalUsers,
    totalGenerations,
    generationsByStatus,
    generationsByType,
    creditsSoldAgg,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.generation.count(),
    prisma.generation.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.generation.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.creditTransaction.aggregate({
      where: { type: 'PURCHASE' },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.count({ where: { type: 'PURCHASE' } }),
  ]);

  return {
    totalUsers,
    totalGenerations,
    generationsByStatus: Object.fromEntries(
      generationsByStatus.map((row) => [row.status, row._count._all])
    ),
    generationsByType: Object.fromEntries(generationsByType.map((row) => [row.type, row._count._all])),
    creditsSold: creditsSoldAgg._sum.amount || 0,
    totalPurchases: revenueAgg,
  };
}

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query);
  const where = query.search
    ? {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getUserDetail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const [recentGenerations, recentTransactions] = await Promise.all([
    prisma.generation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.creditTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  return { ...user, recentGenerations, recentTransactions };
}

async function adjustUserCredits(userId, amount, description) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new AppError('amount must be a non-zero integer', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (amount < 0 && user.credits < Math.abs(amount)) {
    throw new AppError(`Cannot deduct ${Math.abs(amount)} credits, user only has ${user.credits}`, 400);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type: 'ADMIN_ADJUSTMENT',
        description: description || `Manual admin adjustment (${amount > 0 ? '+' : ''}${amount})`,
      },
    });

    return updated.credits;
  });
}

async function setUserActive(userId, isActive) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return prisma.user.update({ where: { id: userId }, data: { isActive }, select: { id: true, isActive: true } });
}

async function setUserRole(userId, role) {
  if (role !== 'USER' && role !== 'ADMIN') {
    throw new AppError('role must be USER or ADMIN', 400);
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return prisma.user.update({ where: { id: userId }, data: { role }, select: { id: true, role: true } });
}

async function listGenerations(query) {
  const { page, limit, skip } = parsePagination(query);
  const where = {};
  if (query.type === 'IMAGE' || query.type === 'VIDEO') where.type = query.type;
  if (['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(query.status)) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.generation.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function listPackages() {
  return prisma.creditPackage.findMany({ orderBy: { priceUsd: 'asc' } });
}

async function createPackage(data) {
  const { name, credits, priceUsd, stripePriceId } = data;
  if (!name || !credits || !priceUsd || !stripePriceId) {
    throw new AppError('name, credits, priceUsd and stripePriceId are required', 400);
  }
  return prisma.creditPackage.create({
    data: { name, credits: Number(credits), priceUsd: Number(priceUsd), stripePriceId },
  });
}

async function updatePackage(id, data) {
  const existing = await prisma.creditPackage.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Credit package not found', 404);
  }

  const allowedFields = ['name', 'credits', 'priceUsd', 'stripePriceId', 'isActive'];
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  return prisma.creditPackage.update({ where: { id }, data: updateData });
}

module.exports = {
  getStats,
  listUsers,
  getUserDetail,
  adjustUserCredits,
  setUserActive,
  setUserRole,
  listGenerations,
  listPackages,
  createPackage,
  updatePackage,
};
