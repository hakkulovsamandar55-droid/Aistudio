const paymentService = require('../services/payment.service');
const creditService = require('../services/credit.service');
const emailService = require('../services/email.service');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Prisma's unique-constraint violation. Two concurrent redeliveries of the
// same event both pass the "already processed?" check, then one of them loses
// this race — which is exactly the outcome we want.
const UNIQUE_VIOLATION = 'P2002';

/**
 * The only place credits are ever added for a purchase. Frontend never
 * calls addCredits directly — it only redirects to Stripe Checkout — so a
 * user cannot grant themselves credits without an actual verified payment.
 *
 * Stripe delivers events *at least* once: a timeout, a 500, or simply a slow
 * response gets the same event sent again. Every handled event id is
 * therefore recorded in `processed_webhook_events`, and for a purchase that
 * insert happens in the same transaction as the credit grant — so a
 * redelivery either finds the row and does nothing, or loses the unique
 * constraint and rolls back. One payment, one grant, either way.
 */
const stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = paymentService.getStripe().webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err.message);
    return res.status(400).json({ success: false, error: `Webhook signature verification failed` });
  }

  try {
    const seen = await prisma.processedWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (seen) {
      logger.info(`Stripe event ${event.id} already processed at ${seen.processedAt.toISOString()}, ignoring`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    await handleEvent(event);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      // A concurrent delivery of this same event got there first. Its
      // transaction granted the credits; ours rolled back untouched.
      logger.info(`Stripe event ${event.id} processed concurrently, ignoring this delivery`);
      return res.status(200).json({ received: true, duplicate: true });
    }
    logger.error('Error handling Stripe webhook event', err);
  }

  // Stripe expects a fast response regardless of internal processing outcome,
  // otherwise it will keep retrying the same event.
  res.status(200).json({ received: true });
};

async function handleEvent(event) {
  const markProcessed = { stripeEventId: event.id, eventType: event.type };

  if (event.type !== 'checkout.session.completed') {
    // Everything else is ignored on purpose, but still recorded so a
    // redelivery is answered from the table instead of re-walking this.
    await prisma.processedWebhookEvent.create({ data: markProcessed });
    return;
  }

  const session = event.data.object;
  const { userId, packageId } = session.metadata || {};

  if (!userId || !packageId) {
    logger.error('Stripe webhook missing metadata', session.id);
    await prisma.processedWebhookEvent.create({ data: markProcessed });
    return;
  }

  const creditPackage = await prisma.creditPackage.findUnique({ where: { id: packageId } });

  if (!creditPackage) {
    logger.error(`Stripe webhook: credit package ${packageId} not found`);
    await prisma.processedWebhookEvent.create({ data: markProcessed });
    return;
  }

  // The grant and the "we handled this" record commit together or not at all.
  await prisma.$transaction(async (tx) => {
    await tx.processedWebhookEvent.create({ data: markProcessed });
    await creditService.addCreditsWithin(
      tx,
      userId,
      creditPackage.credits,
      'PURCHASE',
      `Purchased ${creditPackage.name} package`,
      session.payment_intent
    );
  });

  logger.info(`Granted ${creditPackage.credits} credits to ${userId} for Stripe event ${event.id}`);

  // Receipt is fire-and-forget and deliberately outside the transaction: the
  // credits are already committed, and Stripe must get its 200 regardless of
  // what the mail provider does.
  const buyer = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (buyer) {
    emailService.sendPaymentReceiptEmail(buyer, {
      packageName: creditPackage.name,
      credits: creditPackage.credits,
      amountUsd: creditPackage.priceUsd,
    });
  }
}

module.exports = { stripeWebhook };
