const { app, request, registerUser, grantCredits, auth } = require('./helpers');

describe('POST /api/generate/enhance', () => {
  it('is free — no credits are charged and no plan quota is consumed', async () => {
    const { user, accessToken } = await registerUser();
    const before = await request(app).get('/api/users/me').set(auth(accessToken));

    const res = await request(app)
      .post('/api/generate/enhance')
      .set(auth(accessToken))
      .send({ prompt: 'a cat in space', type: 'VIDEO' });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.enhancedPrompt).toBe('string');
    expect(res.body.data.enhancedPrompt.length).toBeGreaterThan(0);
    expect(res.body.data.originalPrompt).toBe('a cat in space');

    const after = await request(app).get('/api/users/me').set(auth(accessToken));
    expect(after.body.data.credits).toBe(before.body.data.credits);
  });

  it('works with zero credits (never behind checkCredits/checkPlanLimit)', async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .post('/api/generate/enhance')
      .set(auth(accessToken))
      .send({ prompt: 'a red bicycle', type: 'IMAGE' });

    expect(res.status).toBe(200);
  });

  it('rejects an empty prompt', async () => {
    const { accessToken } = await registerUser();
    const res = await request(app)
      .post('/api/generate/enhance')
      .set(auth(accessToken))
      .send({ prompt: '  ', type: 'VIDEO' });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/generate/enhance').send({ prompt: 'x', type: 'VIDEO' });
    expect(res.status).toBe(401);
  });

  it('does not count toward the daily generation quota', async () => {
    const { accessToken } = await registerUser();

    // Well past the FREE tier's daily video cap of 1 — if this endpoint were
    // wired through checkPlanLimit it would 429 by the third call.
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .post('/api/generate/enhance')
        .set(auth(accessToken))
        .send({ prompt: 'a mountain lake', type: 'VIDEO' });
      expect(res.status).toBe(200);
    }
  });
});
