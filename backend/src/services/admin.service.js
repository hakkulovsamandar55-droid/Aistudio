const prisma = require('../config/db');
const AppError = require('../utils/AppError');

const DAYS_IN_TREND = 7;

/** Buckets rows by day so the dashboard can draw a 7-day trend. */
function buildDailySeries(rows, days = DAYS_IN_TREND) {
  const counts = new Map();
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const series = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    series.push({ date: key, count: counts.get(key) || 0 });
  }
  return series;
}

async function getStats() {
  const since = new Date(Date.now() - DAYS_IN_TREND * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    totalGenerations,
    generationsByStatus,
    generationsByType,
    creditsSoldAgg,
    purchaseCount,
    creditsOutstandingAgg,
    recentUsers,
    recentGenerations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.generation.count({ where: { deletedAt: null } }),
    prisma.generation.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.generation.groupBy({ by: ['type'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.creditTransaction.aggregate({ where: { type: 'PURCHASE' }, _sum: { amount: true } }),
    prisma.creditTransaction.count({ where: { type: 'PURCHASE' } }),
    prisma.user.aggregate({ _sum: { credits: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.generation.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
    }),
  ]);

  const byStatus = Object.fromEntries(generationsByStatus.map((row) => [row.status, row._count._all]));
  const completed = byStatus.COMPLETED || 0;
  const failed = byStatus.FAILED || 0;
  const finished = completed + failed;

  return {
    totalUsers,
    activeUsers,
    totalGenerations,
    generationsByStatus: byStatus,
    generationsByType: Object.fromEntries(generationsByType.map((row) => [row.type, row._count._all])),
    creditsSold: creditsSoldAgg._sum.amount || 0,
    totalPurchases: purchaseCount,
    creditsOutstanding: creditsOutstandingAgg._sum.credits || 0,
    successRate: finished === 0 ? null : Math.round((completed / finished) * 100),
    trend: {
      signups: buildDailySeries(recentUsers),
      generations: buildDailySeries(recentGenerations),
    },
  };
}

/**
 * Estimated unit economics: what the platform has spent with providers versus
 * what users paid in credits. Figures are modelled from published vendor
 * pricing (see economics.config.js), not billed amounts.
 */
async function getEconomics() {
  const { unitCostFor, USD_PER_CREDIT, PLANS } = require('../config/economics.config');
  const videoTiers = require('./ai-gateway/videoTiers');

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byModule, purchasedAgg, planCounts] = await Promise.all([
    prisma.generation.groupBy({
      by: ['type', 'provider'],
      where: { status: 'COMPLETED', deletedAt: null, createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { creditsUsed: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { type: 'PURCHASE', createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.user.groupBy({ by: ['plan'], _count: { _all: true } }),
  ]);

  let estimatedCostUsd = 0;
  let creditRevenueUsd = 0;

  const breakdown = byModule.map((row) => {
    const count = row._count._all;
    const credits = row._sum.creditsUsed || 0;
    const cost = unitCostFor(row.type, row.provider) * count;
    const revenue = credits * USD_PER_CREDIT;

    estimatedCostUsd += cost;
    creditRevenueUsd += revenue;

    return {
      module: row.type,
      provider: row.provider,
      generations: count,
      credits,
      estimatedCostUsd: Number(cost.toFixed(4)),
      creditValueUsd: Number(revenue.toFixed(4)),
    };
  });

  return {
    windowDays: 30,
    breakdown: breakdown.sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd),
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(2)),
    creditValueUsd: Number(creditRevenueUsd.toFixed(2)),
    estimatedMarginUsd: Number((creditRevenueUsd - estimatedCostUsd).toFixed(2)),
    creditsPurchased: purchasedAgg._sum.amount || 0,
    purchaseRevenueUsd: Number(((purchasedAgg._sum.amount || 0) * USD_PER_CREDIT).toFixed(2)),
    usersByPlan: Object.fromEntries(planCounts.map((row) => [row.plan, row._count._all])),
    plans: Object.values(PLANS),
    videoTiers: videoTiers.describeEconomics(),
  };
}

async function listAnnouncements() {
  return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
}

async function createAnnouncement(message) {
  if (!message || !message.trim()) {
    throw new AppError('message is required', 400);
  }
  return prisma.announcement.create({ data: { message: message.trim() } });
}

async function updateAnnouncement(id, data) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Announcement not found', 404);
  }

  const updateData = {};
  if (data.message !== undefined) updateData.message = String(data.message).trim();
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  return prisma.announcement.update({ where: { id }, data: updateData });
}

async function deleteAnnouncement(id) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Announcement not found', 404);
  }
  await prisma.announcement.delete({ where: { id } });
  return true;
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
        plan: true,
        planExpiresAt: true,
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
      plan: true,
      planExpiresAt: true,
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
  getEconomics,
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
