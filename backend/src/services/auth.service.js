const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const prisma = require('../config/db');
const { BONUSES } = require('../config/credits.config');
const accountService = require('./account.service');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

// Constructed lazily for the same reason the OpenAI client is: the server
// must boot without GOOGLE_CLIENT_ID set, and only fail when Google sign-in
// is actually attempted.
let _googleClient;
function getGoogleClient() {
  if (!_googleClient) {
    _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return _googleClient;
}

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
  if (!user || !user.password) {
    // Same message either way — confirming an account exists but has no
    // password (Google-only) is as much of an account-enumeration leak as
    // confirming it doesn't exist at all.
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

/**
 * Verifies a Google Identity Services ID token and signs the user in,
 * creating the account on first sign-in (same signup bonus as email/password
 * registration). An email/password account that later signs in with the
 * same Google address gets the Google identity linked onto it rather than
 * getting a second account — the two are the same person.
 */
async function loginWithGoogle(idToken) {
  if (!idToken) {
    throw new AppError('Google ID token is required', 400);
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new AppError('Google sign-in is not configured on this server', 503);
  }

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new AppError('Invalid Google credential', 401);
  }

  if (!payload?.email || !payload.email_verified) {
    throw new AppError('Google account has no verified email', 401);
  }

  const email = payload.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });

    if (existingByEmail) {
      // Same person, previously registered with a password — attach the
      // Google identity instead of creating a second account for one person.
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: payload.sub },
      });
    } else {
      const newReferralCode = await accountService.generateUniqueReferralCode();

      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            password: null,
            googleId: payload.sub,
            name: payload.name || email.split('@')[0],
            credits: BONUSES.SIGNUP,
            referralCode: newReferralCode,
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId: created.id,
            amount: BONUSES.SIGNUP,
            type: 'SIGNUP_BONUS',
            description: 'Welcome bonus for signing up with Google',
          },
        });

        return created;
      });
    }
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
  loginWithGoogle,
  refreshAccessToken,
  toPublicUser,
};
