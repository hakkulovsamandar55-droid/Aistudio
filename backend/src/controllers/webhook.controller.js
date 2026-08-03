const paymentService = require('../services/payment.service');
const creditService = require('../services/credit.service');
const emailService = require('../services/email.service');
const prisma = require('../config/db');
const logger = require('../utils/logger');

/**
 * The only place credits are ever added for a purchase. Frontend never
 * calls addCredits directly — it only redirects to Stripe Checkout — so a
 * user cannot grant themselves credits without an actual verified payment.
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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, packageId } = session.metadata || {};

      if (!userId || !packageId) {
        logger.error('Stripe webhook missing metadata', session.id);
      } else {
        const creditPackage = await prisma.creditPackage.findUnique({ where: { id: packageId } });
        if (creditPackage) {
          await creditService.addCredits(
            userId,
            creditPackage.credits,
            'PURCHASE',
            `Purchased ${creditPackage.name} package`,
            session.payment_intent
          );

          // Receipt is fire-and-forget: the credits are already granted, and
          // Stripe must get its 200 regardless of what the mail provider does.
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
        } else {
          logger.error(`Stripe webhook: credit package ${packageId} not found`);
        }
      }
    }
    // Other event types are intentionally ignored, but we still return 200
    // below so Stripe doesn't keep retrying events we don't care about.
  } catch (err) {
    logger.error('Error handling Stripe webhook event', err);
  }

  // Stripe expects a fast response regardless of internal processing outcome,
  // otherwise it will keep retrying the same event.
  res.status(200).json({ received: true });
};

module.exports = { stripeWebhook };
