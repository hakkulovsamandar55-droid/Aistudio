const Stripe = require('stripe');
const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// Constructed lazily (not at module load) so the server can still boot
// without STRIPE_SECRET_KEY set — e.g. during local dev before payments
// are configured, or when only testing unrelated routes.
let _stripe;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

async function getActivePackages() {
  return prisma.creditPackage.findMany({
    where: { isActive: true },
    orderBy: { priceUsd: 'asc' },
  });
}

async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

async function createCheckoutSession(userId, packageId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const creditPackage = await prisma.creditPackage.findUnique({ where: { id: packageId } });
  if (!creditPackage || !creditPackage.isActive) {
    throw new AppError('Credit package not found', 404);
  }

  const customerId = await ensureStripeCustomer(user);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: creditPackage.stripePriceId, quantity: 1 }],
    success_url: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/billing/cancel`,
    metadata: {
      userId: user.id,
      packageId: creditPackage.id,
    },
  });

  return { checkoutUrl: session.url };
}

module.exports = { getActivePackages, createCheckoutSession, getStripe };
