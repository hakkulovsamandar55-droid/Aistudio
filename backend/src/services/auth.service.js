const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = require('../config/db');
const { BONUSES } = require('../config/credits.config');
const accountService = require('./account.service');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    role: user.role,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    referralCode: user.referralCode,
    // Included on every auth payload (not just GET /me) so the dashboard can
    // render the claim prompt immediately after signup or login.
    dailyBonus: accountService.computeDailyBonusState(user.lastDailyBonusAt),
    createdAt: user.createdAt,
  };
}

async function registerUser(email, password, name, referralCode) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  // An unknown or self-referencing code is ignored rather than rejected —
  // a mistyped code shouldn't block someone from signing up.
  let referrer = null;
  if (referralCode && referralCode.trim()) {
    referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim().toUpperCase() },
      select: { id: true, isActive: true },
    });
    if (referrer && !referrer.isActive) referrer = null;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const newReferralCode = await accountService.generateUniqueReferralCode();
  const signupCredits = BONUSES.SIGNUP + (referrer ? BONUSES.REFERRED : 0);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        credits: signupCredits,
        referralCode: newReferralCode,
        referredById: referrer ? referrer.id : null,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: created.id,
        amount: BONUSES.SIGNUP,
        type: 'SIGNUP_BONUS',
        description: 'Welcome bonus for signing up',
      },
    });

    if (referrer) {
      await tx.creditTransaction.create({
        data: {
          userId: created.id,
          amount: BONUSES.REFERRED,
          type: 'REFERRAL_BONUS',
          description: 'Bonus for signing up with a referral code',
        },
      });

      // Both sides of the referral are credited in the same transaction, so
      // a failure can't leave one party paid and the other not.
      await tx.user.update({
        where: { id: referrer.id },
        data: { credits: { increment: BONUSES.REFERRER } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: referrer.id,
          amount: BONUSES.REFERRER,
          type: 'REFERRAL_BONUS',
          description: `Referral bonus — ${email} signed up with your code`,
        },
      });
    }

    return created;
  });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  };
}

async function loginUser(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('This account has been suspended', 403);
  }

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  };
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }
  if (!user.isActive) {
    throw new AppError('This account has been suspended', 403);
  }

  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  };
}

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  toPublicUser,
};
