const { app, request, prisma, registerUser, grantCredits, auth } = require('./helpers');
const AppError = require('../src/utils/AppError');

describe('image generation', () => {
  it('completes, stores the result and deducts credits', async () => {
    const { user, accessToken } = await registerUser();

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a cat baking pizza' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.resultUrl).toBeTruthy();

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(8);
  });

  it('appends the selected style to the enhanced prompt', async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a lighthouse', style: 'cyberpunk' });

    expect(res.body.data.style).toBe('cyberpunk');
    expect(res.body.data.enhancedPrompt).toContain('cyberpunk aesthetic');
  });

  it('rejects an unknown style', async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'a lighthouse', style: 'not-a-real-style' });

    expect(res.status).toBe(400);
  });

  it.each([
    ['empty prompt', ''],
    ['whitespace prompt', '   '],
    ['over-long prompt', 'x'.repeat(501)],
  ])('rejects %s', async (_label, prompt) => {
    const { accessToken } = await registerUser();
    const res = await request(app).post('/api/generate/image').set(auth(accessToken)).send({ prompt });
    expect(res.status).toBe(400);
  });

  it.each([
    // A provider that maps its own failure surfaces that status through...
    ['a provider error', new AppError('upstream refused', 502), 502],
    // ...while an unexpected crash is a bug on our side, so it stays a 500.
    ['an unexpected crash', new Error('provider exploded'), 500],
  ])('does not charge for a generation that fails with %s', async (_label, thrown, expectedStatus) => {
    const { user, accessToken } = await registerUser();

    const gateway = require('../src/services/ai-gateway');
    const spy = jest.spyOn(gateway.imageGateway, 'generateImage').mockRejectedValueOnce(thrown);

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'doomed' });

    expect(res.status).toBe(expectedStatus);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(10); // untouched

    const generation = await prisma.generation.findFirst({ where: { userId: user.id } });
    expect(generation.status).toBe('FAILED');
    expect(generation.errorMessage).toContain(thrown.message);

    spy.mockRestore();
  });

  it('hides internal error detail from the client in production mode', async () => {
    const { accessToken } = await registerUser();

    const gateway = require('../src/services/ai-gateway');
    const spy = jest
      .spyOn(gateway.imageGateway, 'generateImage')
      .mockRejectedValueOnce(new Error('secret internal detail'));

    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'doomed' });

    process.env.NODE_ENV = previousEnv;
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
  });
});

describe('video generation', () => {
  it('returns immediately as PROCESSING and finishes in the background', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 30);

    const res = await request(app)
      .post('/api/generate/video')
      .set(auth(accessToken))
      .send({ prompt: 'a drone shot over mountains' });

    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('PROCESSING');

    const generationId = res.body.data.generationId;

    // The mock video provider resolves after ~1s, but this shares an event
    // loop with the rest of the suite, so the budget is generous. The loop
    // exits the moment the row settles.
    let generation;
    for (let attempt = 0; attempt < 75; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 200));
      // eslint-disable-next-line no-await-in-loop
      generation = await prisma.generation.findUnique({ where: { id: generationId } });
      if (generation.status === 'COMPLETED' || generation.status === 'FAILED') break;
    }

    expect(generation.status).toBe('COMPLETED');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(20); // 40 - 20
  });
});

describe('generation ownership and actions', () => {
  async function createGeneration() {
    const owner = await registerUser();
    const res = await request(app)
      .post('/api/generate/image')
      .set(auth(owner.accessToken))
      .send({ prompt: 'shared subject' });
    return { owner, generation: res.body.data };
  }

  it('lets the owner favourite and unfavourite', async () => {
    const { owner, generation } = await createGeneration();

    const on = await request(app)
      .patch(`/api/generate/${generation.id}/favorite`)
      .set(auth(owner.accessToken))
      .send({ isFavorite: true });
    expect(on.body.data.isFavorite).toBe(true);

    const off = await request(app)
      .patch(`/api/generate/${generation.id}/favorite`)
      .set(auth(owner.accessToken))
      .send({ isFavorite: false });
    expect(off.body.data.isFavorite).toBe(false);
  });

  it('hides another user\'s generation behind a 404', async () => {
    const { generation } = await createGeneration();
    const stranger = await registerUser();

    const paths = [
      request(app).get(`/api/generate/${generation.id}/status`).set(auth(stranger.accessToken)),
      request(app).get(`/api/generate/${generation.id}/download`).set(auth(stranger.accessToken)),
      request(app)
        .patch(`/api/generate/${generation.id}/favorite`)
        .set(auth(stranger.accessToken))
        .send({ isFavorite: true }),
      request(app).delete(`/api/generate/${generation.id}`).set(auth(stranger.accessToken)),
    ];

    const results = await Promise.all(paths);
    results.forEach((res) => expect(res.status).toBe(404));
  });

  it('soft-deletes: hidden from the API but retained in the table', async () => {
    const { owner, generation } = await createGeneration();

    await request(app).delete(`/api/generate/${generation.id}`).set(auth(owner.accessToken));

    const list = await request(app).get('/api/users/me/generations').set(auth(owner.accessToken));
    expect(list.body.data).toHaveLength(0);

    const status = await request(app)
      .get(`/api/generate/${generation.id}/status`)
      .set(auth(owner.accessToken));
    expect(status.status).toBe(404);

    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row).not.toBeNull();
    expect(row.deletedAt).not.toBeNull();
  });

  it('filters history by favourite, type and search text', async () => {
    const { owner, generation } = await createGeneration();
    await request(app)
      .patch(`/api/generate/${generation.id}/favorite`)
      .set(auth(owner.accessToken))
      .send({ isFavorite: true });

    const favourites = await request(app)
      .get('/api/users/me/generations?favorite=true')
      .set(auth(owner.accessToken));
    expect(favourites.body.data).toHaveLength(1);

    const videosOnly = await request(app)
      .get('/api/users/me/generations?type=VIDEO')
      .set(auth(owner.accessToken));
    expect(videosOnly.body.data).toHaveLength(0);

    const hit = await request(app)
      .get('/api/users/me/generations?search=shared')
      .set(auth(owner.accessToken));
    expect(hit.body.data).toHaveLength(1);

    const miss = await request(app)
      .get('/api/users/me/generations?search=nothingmatches')
      .set(auth(owner.accessToken));
    expect(miss.body.data).toHaveLength(0);
  });

  it('serves a download with an attachment header', async () => {
    const { owner, generation } = await createGeneration();

    // Swap in an inline payload so the test never touches the network.
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        resultUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
    });

    const res = await request(app)
      .get(`/api/generate/${generation.id}/download`)
      .set(auth(owner.accessToken));

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-type']).toBe('image/png');
  });
});

describe('style catalogue', () => {
  it('lists image and video presets with credit costs', async () => {
    const { accessToken } = await registerUser();
    const res = await request(app).get('/api/generate/styles').set(auth(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.image.length).toBeGreaterThan(1);
    expect(res.body.data.video.length).toBeGreaterThan(1);
    expect(res.body.data.costs.IMAGE).toBe(2);
    expect(res.body.data.costs.VIDEO).toBe(20);
  });
});
