const { request, app, prisma, registerUser, registerAdmin, grantCredits, auth } = require('./helpers');

async function createGeneration(userId, type, status = 'COMPLETED') {
  return prisma.generation.create({
    data: {
      userId,
      type,
      userPrompt: 'test prompt',
      status,
      provider: 'mock',
      resultUrl: status === 'COMPLETED' ? 'https://example.com/result.png' : null,
    },
  });
}

describe('Free-tier daily limits and plans', () => {
  it('reports the FREE plan quota with zero usage for a new user', async () => {
    const { accessToken } = await registerUser();
    const res = await request(app).get('/api/users/me/quota').set(auth(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe('FREE');
    expect(res.body.data.unlimited).toBe(false);
    expect(res.body.data.modules.IMAGE).toEqual({ limit: 2, used: 0, remaining: 2 });
    expect(res.body.data.modules.VIDEO).toEqual({ limit: 1, used: 0, remaining: 1 });
  });

  it('blocks image generation once the FREE daily cap is reached', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);
    await createGeneration(user.id, 'IMAGE');
    await createGeneration(user.id, 'IMAGE');

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a red bicycle' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/2 ta image/);
  });

  it('allows generation again once under the cap', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);
    await createGeneration(user.id, 'IMAGE');

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a red bicycle' });

    expect(res.status).toBe(201);
  });

  it('does not count a FAILED generation against the daily quota', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);
    await createGeneration(user.id, 'IMAGE', 'FAILED');
    await createGeneration(user.id, 'IMAGE', 'FAILED');

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a red bicycle' });

    expect(res.status).toBe(201);
  });

  it('checkPlanLimit runs before the credit check', async () => {
    const { user, accessToken } = await registerUser();
    // No credits granted at all, but the daily cap is what should trip first.
    await createGeneration(user.id, 'IMAGE');
    await createGeneration(user.id, 'IMAGE');

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a red bicycle' });

    expect(res.status).toBe(429);
  });

  it('a PRO user has no daily cap', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: 'PRO', planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    await createGeneration(user.id, 'IMAGE');
    await createGeneration(user.id, 'IMAGE');
    await createGeneration(user.id, 'IMAGE');

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a red bicycle' });

    expect(res.status).toBe(201);

    const quota = await request(app).get('/api/users/me/quota').set(auth(accessToken));
    expect(quota.body.data.plan).toBe('PRO');
    expect(quota.body.data.unlimited).toBe(true);
  });

  it('an expired PRO plan falls back to FREE limits', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: 'PRO', planExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    await createGeneration(user.id, 'IMAGE');
    await createGeneration(user.id, 'IMAGE');

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a red bicycle' });

    expect(res.status).toBe(429);

    const quota = await request(app).get('/api/users/me/quota').set(auth(accessToken));
    expect(quota.body.data.plan).toBe('FREE');
  });

  describe('admin plan management', () => {
    it('an admin can set a user to PRO', async () => {
      const admin = await registerAdmin();
      const { user } = await registerUser();

      const res = await request(app)
        .patch(`/api/admin/users/${user.id}/plan`)
        .set(auth(admin.accessToken))
        .send({ plan: 'PRO' });

      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe('PRO');
      expect(res.body.data.planExpiresAt).not.toBeNull();
    });

    it('an admin can move a user back to FREE, clearing the expiry', async () => {
      const admin = await registerAdmin();
      const { user } = await registerUser();
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'PRO', planExpiresAt: new Date(Date.now() + 100000) },
      });

      const res = await request(app)
        .patch(`/api/admin/users/${user.id}/plan`)
        .set(auth(admin.accessToken))
        .send({ plan: 'FREE' });

      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe('FREE');
      expect(res.body.data.planExpiresAt).toBeNull();
    });

    it('rejects an unknown plan', async () => {
      const admin = await registerAdmin();
      const { user } = await registerUser();

      const res = await request(app)
        .patch(`/api/admin/users/${user.id}/plan`)
        .set(auth(admin.accessToken))
        .send({ plan: 'ENTERPRISE' });

      expect(res.status).toBe(400);
    });

    it('a non-admin cannot set a plan', async () => {
      const { accessToken } = await registerUser();
      const { user: other } = await registerUser();

      const res = await request(app)
        .patch(`/api/admin/users/${other.id}/plan`)
        .set(auth(accessToken))
        .send({ plan: 'PRO' });

      expect(res.status).toBe(403);
    });
  });
});
