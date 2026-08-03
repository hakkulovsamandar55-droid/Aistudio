const { request, app, prisma, registerUser } = require('./helpers');
const paymentService = require('../src/services/payment.service');

/**
 * Stripe delivers events at least once — a timeout or a slow response gets
 * the same event sent again — so the risk being tested here is one payment
 * granting credits twice.
 *
 * Signature verification is stubbed because the point of these tests is what
 * happens *after* a payload is trusted; the signature path itself is exercised
 * by the rejection test at the bottom.
 */
function stubStripeEvent(event) {
  jest.spyOn(paymentService, 'getStripe').mockReturnValue({
    webhooks: { constructEvent: () => event },
  });
}

function checkoutEvent(id, { userId, packageId, paymentIntent = 'pi_test_1' }) {
  return {
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        payment_intent: paymentIntent,
        metadata: { userId, packageId },
      },
    },
  };
}

async function createPackage(credits = 100) {
  return prisma.creditPackage.create({
    data: {
      name: 'Starter',
      credits,
      priceUsd: 9.99,
      stripePriceId: `price_${Math.random().toString(36).slice(2)}`,
    },
  });
}

function postWebhook() {
  return request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', 'test_signature')
    .set('Content-Type', 'application/json')
    .send({});
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Stripe webhook idempotency', () => {
  it('grants credits once and records the event', async () => {
    const { user } = await registerUser();
    const pkg = await createPackage(100);
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    stubStripeEvent(checkoutEvent('evt_once', { userId: user.id, packageId: pkg.id }));
    const res = await postWebhook();

    expect(res.status).toBe(200);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 100);

    const recorded = await prisma.processedWebhookEvent.findUnique({
      where: { stripeEventId: 'evt_once' },
    });
    expect(recorded).not.toBeNull();
    expect(recorded.eventType).toBe('checkout.session.completed');
  });

  it('grants credits only once when the same event is delivered twice', async () => {
    const { user } = await registerUser();
    const pkg = await createPackage(100);
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    stubStripeEvent(checkoutEvent('evt_duplicate', { userId: user.id, packageId: pkg.id }));

    const first = await postWebhook();
    const second = await postWebhook();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 100);

    // And only one PURCHASE row, so the credit history isn't doubled either.
    const purchases = await prisma.creditTransaction.findMany({
      where: { userId: user.id, type: 'PURCHASE' },
    });
    expect(purchases).toHaveLength(1);
  });

  it('holds up when the same event arrives five times in parallel', async () => {
    const { user } = await registerUser();
    const pkg = await createPackage(50);
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    stubStripeEvent(checkoutEvent('evt_concurrent', { userId: user.id, packageId: pkg.id }));

    const responses = await Promise.all([
      postWebhook(),
      postWebhook(),
      postWebhook(),
      postWebhook(),
      postWebhook(),
    ]);

    // Stripe must always get a 200 — a 500 just makes it retry harder.
    responses.forEach((res) => expect(res.status).toBe(200));

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 50);

    const purchases = await prisma.creditTransaction.findMany({
      where: { userId: user.id, type: 'PURCHASE' },
    });
    expect(purchases).toHaveLength(1);
  });

  it('treats two different events as two separate purchases', async () => {
    const { user } = await registerUser();
    const pkg = await createPackage(30);
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    stubStripeEvent(checkoutEvent('evt_first', { userId: user.id, packageId: pkg.id }));
    await postWebhook();

    jest.restoreAllMocks();
    stubStripeEvent(checkoutEvent('evt_second', { userId: user.id, packageId: pkg.id }));
    await postWebhook();

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 60);
  });

  it('records ignored event types so their redeliveries are cheap', async () => {
    stubStripeEvent({ id: 'evt_ignored', type: 'payment_intent.created', data: { object: {} } });

    const res = await postWebhook();
    expect(res.status).toBe(200);

    const recorded = await prisma.processedWebhookEvent.findUnique({
      where: { stripeEventId: 'evt_ignored' },
    });
    expect(recorded.eventType).toBe('payment_intent.created');
  });

  it('grants nothing and still records the event when the package is unknown', async () => {
    const { user } = await registerUser();
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    stubStripeEvent(
      checkoutEvent('evt_bad_package', { userId: user.id, packageId: 'does-not-exist' })
    );
    const res = await postWebhook();

    expect(res.status).toBe(200);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits);

    const recorded = await prisma.processedWebhookEvent.findUnique({
      where: { stripeEventId: 'evt_bad_package' },
    });
    expect(recorded).not.toBeNull();
  });

  it('rejects a payload whose signature does not verify, and records nothing', async () => {
    jest.spyOn(paymentService, 'getStripe').mockReturnValue({
      webhooks: {
        constructEvent: () => {
          throw new Error('No signatures found matching the expected signature');
        },
      },
    });

    const res = await postWebhook();

    expect(res.status).toBe(400);
    expect(await prisma.processedWebhookEvent.count()).toBe(0);
  });
});
