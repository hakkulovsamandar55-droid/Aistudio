const prisma = require('../config/db');
const { planFor, dailyLimitFor, PLANS } = require('../config/economics.config');
const AppError = require('../utils/AppError');

/**
 * Plan entitlements and free-tier throttling.
 *
 * The daily cap is the cost control that matters most: a free user who can
 * render unlimited video costs more than a paying user brings in. Usage is
 * counted from the generations table rather than a separate counter, so it
 * can't drift out of sync with what was actually produced.
 */

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** A PRO plan lapses back to FREE once it expires. */
function effectivePlan(user) {
  if (!user) return 'FREE';
  if (user.plan === 'PRO' && user.planExpiresAt && user.planExpiresAt < new Date()) {
    return 'FREE';
  }
  return user.plan || 'FREE';
}

async function usedToday(userId, moduleId) {
  return prisma.generation.count({
    where: {
      userId,
      type: moduleId,
      createdAt: { gte: startOfToday() },
      // Failed attempts aren't charged, so they shouldn't consume quota either.
      status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
    },
  });
}

/**
 * @returns {{ allowed: boolean, limit: number|null, used: number, remaining: number|null }}
 */
async function checkDailyLimit(userId, moduleId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const plan = effectivePlan(user);
  const limit = dailyLimitFor(plan, moduleId);

  if (limit === null) {
    return { allowed: true, limit: null, used: 0, remaining: null, plan };
  }

  const used = await usedToday(userId, moduleId);
  return {
    allowed: used < limit,
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    plan,
  };
}

/** Per-module quota snapshot for the client, so the UI can warn before a 429. */
async function getQuotaSummary(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!user) return null;

  const plan = effectivePlan(user);
  const limits = planFor(plan).dailyLimits;

  if (!limits) {
    return { plan, unlimited: true, modules: {} };
  }

  const modules = {};
  for (const [moduleId, limit] of Object.entries(limits)) {
    // eslint-disable-next-line no-await-in-loop
    const used = await usedToday(userId, moduleId);
    modules[moduleId] = { limit, used, remaining: Math.max(limit - used, 0) };
  }

  return { plan, unlimited: false, modules };
}

async function setPlan(userId, planId, expiresAt) {
  if (!PLANS[planId]) {
    throw new AppError(`Unknown plan: ${planId}`, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      plan: planId,
      planExpiresAt: planId === 'FREE' ? null : expiresAt ?? defaultExpiry(),
    },
    select: { id: true, plan: true, planExpiresAt: true },
  });
}

function defaultExpiry() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

module.exports = { effectivePlan, checkDailyLimit, getQuotaSummary, setPlan, usedToday, PLANS };
