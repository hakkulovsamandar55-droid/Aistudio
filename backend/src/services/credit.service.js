const prisma = require('../config/db');
const AppError = require('../utils/AppError');

class InsufficientCreditsError extends AppError {
  constructor(required, available) {
    super(`Insufficient credits. You need ${required} credits, you have ${available}.`, 402);
    this.required = required;
    this.available = available;
  }
}

async function checkSufficientCredits(userId, requiredCredits) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.credits < requiredCredits) {
    throw new InsufficientCreditsError(requiredCredits, user.credits);
  }

  return user.credits;
}

// `amount` must already carry the correct sign — deductCredits subtracts it
// as given, so callers pass the number of credits to remove.
async function deductCredits(userId, amount, type, description) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (user.credits < amount) {
      throw new InsufficientCreditsError(amount, user.credits);
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: { userId, amount: -amount, type, description },
    });

    return updated.credits;
  });
}

async function addCredits(userId, amount, type, description, stripePaymentId = null) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: { userId, amount, type, description, stripePaymentId },
    });

    return updated.credits;
  });
}

async function refundCredits(userId, amount, generationId) {
  return addCredits(userId, amount, 'REFUND', `Refund for failed generation ${generationId}`);
}

module.exports = {
  InsufficientCreditsError,
  checkSufficientCredits,
  deductCredits,
  addCredits,
  refundCredits,
};
