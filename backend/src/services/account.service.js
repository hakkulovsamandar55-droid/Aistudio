const crypto = require('crypto');
const bcrypt = require('bcrypt');

const prisma = require('../config/db');
const { BONUSES, DAILY_BONUS_COOLDOWN_MS } = require('../config/credits.config');
const creditService = require('./credit.service');
const emailService = require('./email.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Ambiguity-free alphabet (no O/0/I/1) — these codes get typed by hand. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReferralCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Retries on the (astronomically unlikely) unique-collision. */
async function generateUniqueReferralCode(client = prisma) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    const existing = await client.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new AppError('Could not allocate a referral code, please retry', 500);
}

async function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required', 400);
  }
  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (!user.password) {
    // Signed up via Google, so there is no password to change — they'd set
    // one for the first time via "forgot password" instead.
    throw new AppError('This account signs in with Google and has no password to change', 400);
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    throw new AppError('Current password is incorrect', 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });

  // Any outstanding reset links are void once the password changes.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  return true;
}

/**
 * Creates a single-use, time-limited reset token. Only the SHA-256 hash is
 * stored, so a leaked database dump can't be turned into working reset links.
 *
 * The raw token leaves this function twice: once by email (fire-and-forget,
 * so a mail outage can't turn into a failed request or an enumeration signal
 * from a slow response) and once as a return value, which the controller only
 * exposes when there is no mail provider to deliver it.
 */
async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always report success: telling an anonymous caller whether an address is
  // registered is an account-enumeration leak.
  if (!user) {
    return { token: null };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  emailService.sendPasswordResetEmail(user, token);

  logger.info(`Password reset requested for ${email}`);
  return { token };
}

async function resetPassword(token, newPassword) {
  if (!token) {
    throw new AppError('Reset token is required', 400);
  }
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('This reset link is invalid or has expired', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return true;
}

async function getReferralSummary(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const [count, earnedAgg] = await Promise.all([
    prisma.user.count({ where: { referredById: userId } }),
    prisma.creditTransaction.aggregate({
      where: { userId, type: 'REFERRAL_BONUS' },
      _sum: { amount: true },
    }),
  ]);

  return {
    referralCode: user.referralCode,
    referredCount: count,
    creditsEarned: earnedAgg._sum.amount || 0,
    rewardPerReferral: BONUSES.REFERRER,
  };
}

async function claimDailyBonus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastDailyBonusAt: true },
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const now = Date.now();
  if (user.lastDailyBonusAt) {
    const elapsed = now - user.lastDailyBonusAt.getTime();
    if (elapsed < DAILY_BONUS_COOLDOWN_MS) {
      const availableAt = new Date(user.lastDailyBonusAt.getTime() + DAILY_BONUS_COOLDOWN_MS);
      throw new AppError(
        `Daily bonus already claimed. Next one available at ${availableAt.toISOString()}`,
        429
      );
    }
  }

  // Stamp the claim first: if two requests race, the second one finds an
  // updated timestamp and its conditional update matches zero rows, so the
  // bonus can't be granted twice.
  const stamped = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastDailyBonusAt: null },
        { lastDailyBonusAt: { lt: new Date(now - DAILY_BONUS_COOLDOWN_MS) } },
      ],
    },
    data: { lastDailyBonusAt: new Date(now) },
  });

  if (stamped.count === 0) {
    throw new AppError('Daily bonus already claimed', 429);
  }

  const credits = await creditService.addCredits(
    userId,
    BONUSES.DAILY,
    'DAILY_BONUS',
    'Daily login bonus'
  );

  return { credits, awarded: BONUSES.DAILY, nextAvailableAt: new Date(now + DAILY_BONUS_COOLDOWN_MS) };
}

/**
 * Pure: derives bonus availability from a timestamp the caller already has.
 * Keeping it query-free lets login/register include the state in their
 * responses without a second round trip to the database.
 */
function computeDailyBonusState(lastDailyBonusAt) {
  if (!lastDailyBonusAt) {
    return { available: true, amount: BONUSES.DAILY, nextAvailableAt: null };
  }

  const nextAvailableAt = new Date(lastDailyBonusAt.getTime() + DAILY_BONUS_COOLDOWN_MS);
  return {
    available: nextAvailableAt <= new Date(),
    amount: BONUSES.DAILY,
    nextAvailableAt,
  };
}

async function getDailyBonusState(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastDailyBonusAt: true },
  });
  if (!user) return { available: false };

  return computeDailyBonusState(user.lastDailyBonusAt);
}

module.exports = {
  generateReferralCode,
  generateUniqueReferralCode,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getReferralSummary,
  claimDailyBonus,
  computeDailyBonusState,
  getDailyBonusState,
};
