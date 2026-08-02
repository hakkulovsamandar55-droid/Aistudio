const { app, request, prisma, registerUser, auth } = require('./helpers');

async function createSharedGeneration(prompt = 'a public masterpiece') {
  const owner = await registerUser();
  const created = await request(app)
    .post('/api/generate/image')
    .set(auth(owner.accessToken))
    .send({ prompt });

  await request(app)
    .patch(`/api/generate/${created.body.data.id}/public`)
    .set(auth(owner.accessToken))
    .send({ isPublic: true });

  return { owner, generation: created.body.data };
}

describe('public gallery', () => {
  it('is readable without authentication', async () => {
    const res = await request(app).get('/api/gallery');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('lists nothing until a generation is explicitly shared', async () => {
    const owner = await registerUser();
    await request(app).post('/api/generate/image').set(auth(owner.accessToken)).send({ prompt: 'private' });

    const res = await request(app).get('/api/gallery');
    expect(res.body.data).toHaveLength(0);
  });

  it('lists a generation once shared', async () => {
    await createSharedGeneration();

    const res = await request(app).get('/api/gallery');
    expect(res.body.data).toHaveLength(1);
  });

  it('never leaks the creator\'s email or the enhanced prompt', async () => {
    await createSharedGeneration();

    const res = await request(app).get('/api/gallery');
    const item = res.body.data[0];

    expect(item.user.name).toBeTruthy();
    expect(item.user.email).toBeUndefined();
    expect(item.enhancedPrompt).toBeUndefined();
    expect(item.userId).toBeUndefined();
    expect(item.creditsUsed).toBeUndefined();
  });

  it('drops the item again when unshared', async () => {
    const { owner, generation } = await createSharedGeneration();

    await request(app)
      .patch(`/api/generate/${generation.id}/public`)
      .set(auth(owner.accessToken))
      .send({ isPublic: false });

    const res = await request(app).get('/api/gallery');
    expect(res.body.data).toHaveLength(0);
  });

  it('drops the item when the owner deletes it', async () => {
    const { owner, generation } = await createSharedGeneration();

    await request(app).delete(`/api/generate/${generation.id}`).set(auth(owner.accessToken));

    const res = await request(app).get('/api/gallery');
    expect(res.body.data).toHaveLength(0);
  });

  it('refuses to share a generation that never completed', async () => {
    const owner = await registerUser();
    const generation = await prisma.generation.create({
      data: {
        userId: owner.user.id,
        type: 'IMAGE',
        userPrompt: 'stuck',
        status: 'FAILED',
        provider: 'mock',
      },
    });

    const res = await request(app)
      .patch(`/api/generate/${generation.id}/public`)
      .set(auth(owner.accessToken))
      .send({ isPublic: true });

    expect(res.status).toBe(400);
  });

  it('filters by type', async () => {
    await createSharedGeneration();

    const images = await request(app).get('/api/gallery?type=IMAGE');
    expect(images.body.data).toHaveLength(1);

    const videos = await request(app).get('/api/gallery?type=VIDEO');
    expect(videos.body.data).toHaveLength(0);
  });

  it('paginates', async () => {
    await createSharedGeneration('first');
    await createSharedGeneration('second');

    const res = await request(app).get('/api/gallery?page=1&limit=1');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
  });
});

describe('health check', () => {
  it('responds without auth', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns a JSON 404 for an unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
