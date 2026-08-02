const { app, request, prisma, registerUser, grantCredits, auth } = require('./helpers');
const creditService = require('../src/services/credit.service');

describe('credit service', () => {
  it('deducts credits and records a matching transaction atomically', async () => {
    const { user } = await registerUser();

    const remaining = await creditService.deductCredits(user.id, 4, 'GENERATION_IMAGE', 'test spend');
    expect(remaining).toBe(6);

    const tx = await prisma.creditTransaction.findFirst({
      where: { userId: user.id, type: 'GENERATION_IMAGE' },
    });
    expect(tx.amount).toBe(-4);
  });

  it('refuses to overdraw and leaves the balance untouched', async () => {
    const { user } = await registerUser();

    await expect(
      creditService.deductCredits(user.id, 999, 'GENERATION_IMAGE', 'too much')
    ).rejects.toThrow(/Insufficient credits/);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(10);

    // The failed attempt must not have left a stray transaction behind.
    const spendRows = await prisma.creditTransaction.count({
      where: { userId: user.id, type: 'GENERATION_IMAGE' },
    });
    expect(spendRows).toBe(0);
  });

  it('adds credits with a transaction row', async () => {
    const { user } = await registerUser();

    const balance = await creditService.addCredits(user.id, 50, 'PURCHASE', 'bought pack', 'pi_123');
    expect(balance).toBe(60);

    const tx = await prisma.creditTransaction.findFirst({ where: { type: 'PURCHASE' } });
    expect(tx.amount).toBe(50);
    expect(tx.stripePaymentId).toBe('pi_123');
  });

  it('keeps the balance consistent under concurrent deductions', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 90); // 100 total

    // 20 concurrent 5-credit spends: exactly 100 credits' worth, no more.
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        creditService.deductCredits(user.id, 5, 'GENERATION_IMAGE', 'concurrent')
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const after = await prisma.user.findUnique({ where: { id: user.id } });

    expect(after.credits).toBe(100 - succeeded * 5);
    expect(after.credits).toBeGreaterThanOrEqual(0);
  });

  it('refunds credits under the REFUND type', async () => {
    const { user } = await registerUser();
    await creditService.refundCredits(user.id, 20, 'gen-abc');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(30);

    const tx = await prisma.creditTransaction.findFirst({ where: { type: 'REFUND' } });
    expect(tx.description).toContain('gen-abc');
  });
});

describe('credit endpoints', () => {
  it('blocks generation with a 402 when credits are short', async () => {
    const { user, accessToken } = await registerUser();
    await prisma.user.update({ where: { id: user.id }, data: { credits: 0 } });

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a cat' });

    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/Insufficient credits/);
  });

  it('returns a paginated credit history', async () => {
    const { user, accessToken } = await registerUser();
    for (let i = 0; i < 5; i += 1) {
      await creditService.addCredits(user.id, 1, 'ADMIN_ADJUSTMENT', `grant ${i}`);
    }

    const res = await request(app)
      .get('/api/users/me/credits/history?page=1&limit=3')
      .set(auth(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination.total).toBe(6); // 5 grants + signup bonus
  });
});
