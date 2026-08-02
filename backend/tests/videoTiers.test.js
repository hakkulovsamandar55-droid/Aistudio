const { app, request, prisma, registerUser, grantCredits, auth } = require('./helpers');
const videoTiers = require('../src/services/ai-gateway/videoTiers');
const { gateway, videoGateway } = require('../src/services/ai-gateway');
const AppError = require('../src/utils/AppError');

/** Waits for the fire-and-forget video pipeline to settle. */
async function waitForGeneration(generationId, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 150));
    // eslint-disable-next-line no-await-in-loop
    const row = await prisma.generation.findUnique({ where: { id: generationId } });
    if (row && (row.status === 'COMPLETED' || row.status === 'FAILED')) return row;
  }
  throw new Error('generation did not settle in time');
}

describe('video tier config', () => {
  it('exposes the four tiers cheapest-first', () => {
    expect(videoTiers.TIER_ORDER).toEqual(['low', 'standard', 'better', 'ultra']);

    const prices = videoTiers.TIER_ORDER.map((id) => videoTiers.VIDEO_TIERS[id].credits);
    const ascending = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(ascending);
  });

  it.each([
    ['low', 'wan', 8],
    ['standard', 'kling', 20],
    ['better', 'runway', 35],
    ['ultra', 'veo', 60],
  ])('maps tier %s to provider %s at %i credits', (quality, provider, credits) => {
    const tier = videoTiers.resolveTier(quality);
    expect(tier.provider).toBe(provider);
    expect(tier.credits).toBe(credits);
    expect(videoTiers.creditCostForQuality(quality)).toBe(credits);
  });

  it('keeps the historical video price on the default tier', () => {
    expect(videoTiers.DEFAULT_TIER).toBe('standard');
    expect(videoTiers.creditCostForQuality(undefined)).toBe(20);
  });

  it.each([[undefined], [null], ['premium'], [''], [42]])(
    'falls back to the default tier for %p',
    (quality) => {
      expect(videoTiers.resolveTier(quality).id).toBe('standard');
    }
  );

  it('validates tier names', () => {
    expect(videoTiers.isValidTier('ultra')).toBe(true);
    expect(videoTiers.isValidTier('nonsense')).toBe(false);
  });

  it('walks down one tier at a time and stops at the cheapest', () => {
    expect(videoTiers.lowerTier('ultra').id).toBe('better');
    expect(videoTiers.lowerTier('better').id).toBe('standard');
    expect(videoTiers.lowerTier('standard').id).toBe('low');
    expect(videoTiers.lowerTier('low')).toBeNull();
  });

  it('hides provider and model names from the public catalogue', () => {
    const listed = videoTiers.listTiers();
    expect(listed).toHaveLength(4);
    listed.forEach((tier) => {
      expect(tier.provider).toBeUndefined();
      expect(tier.model).toBeUndefined();
      expect(tier.credits).toBeGreaterThan(0);
      expect(tier.label).toBeTruthy();
    });
  });

  it('only references providers that exist in the gateway registry', () => {
    const { PROVIDERS } = require('../src/services/ai-gateway/registry');
    Object.values(videoTiers.VIDEO_TIERS).forEach((tier) => {
      expect(PROVIDERS.VIDEO[tier.provider]).toBeDefined();
    });
  });
});

describe('tier routing through the gateway', () => {
  let runSpy;

  beforeEach(() => {
    runSpy = jest
      .spyOn(gateway, 'run')
      .mockImplementation(async (moduleId, prompt, options) => ({
        url: 'https://example.test/clip.mp4',
        provider: options.provider,
        module: moduleId,
      }));
  });

  afterEach(() => {
    runSpy.mockRestore();
    delete process.env.VIDEO_TIER_FALLBACK;
  });

  it.each([
    ['low', 'wan', 'wan2.2-t2v-plus'],
    ['standard', 'kling', 'kling-v2-master'],
    ['better', 'runway', 'gen4_turbo'],
    ['ultra', 'veo', 'veo-3.0-generate-001'],
  ])('routes quality %s to %s with its model', async (quality, provider, model) => {
    const result = await videoGateway.generateVideo('a lighthouse', { quality });

    expect(runSpy).toHaveBeenCalledTimes(1);
    const [moduleId, , options] = runSpy.mock.calls[0];
    expect(moduleId).toBe('VIDEO');
    expect(options.provider).toBe(provider);
    expect(options.model).toBe(model);
    expect(result.quality).toBe(quality);
  });

  it('routes an unknown quality through the default tier', async () => {
    await videoGateway.generateVideo('a lighthouse', { quality: 'gigachad' });

    expect(runSpy.mock.calls[0][2].provider).toBe('kling');
  });

  it('forwards caller options to the provider', async () => {
    await videoGateway.generateVideo('a lighthouse', { quality: 'low', duration: 9, aspectRatio: '9:16' });

    const options = runSpy.mock.calls[0][2];
    expect(options.duration).toBe(9);
    expect(options.aspectRatio).toBe('9:16');
  });

  it('propagates a provider failure when fallback is disabled', async () => {
    process.env.VIDEO_TIER_FALLBACK = 'false';
    runSpy.mockRejectedValueOnce(new AppError('kling exploded', 502));

    await expect(videoGateway.generateVideo('boom', { quality: 'standard' })).rejects.toThrow(
      'kling exploded'
    );
    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('degrades one tier down when fallback is enabled', async () => {
    process.env.VIDEO_TIER_FALLBACK = 'true';
    runSpy.mockRejectedValueOnce(new AppError('veo exploded', 502));

    const result = await videoGateway.generateVideo('boom', { quality: 'ultra' });

    expect(runSpy).toHaveBeenCalledTimes(2);
    expect(runSpy.mock.calls[0][2].provider).toBe('veo');
    expect(runSpy.mock.calls[1][2].provider).toBe('runway');
    expect(result.quality).toBe('better');
  });

  it('does not retry below the cheapest tier', async () => {
    process.env.VIDEO_TIER_FALLBACK = 'true';
    runSpy.mockRejectedValueOnce(new AppError('wan exploded', 502));

    await expect(videoGateway.generateVideo('boom', { quality: 'low' })).rejects.toThrow(
      'wan exploded'
    );
    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('surfaces the failure when the fallback tier also fails', async () => {
    process.env.VIDEO_TIER_FALLBACK = 'true';
    runSpy
      .mockRejectedValueOnce(new AppError('primary down', 502))
      .mockRejectedValueOnce(new AppError('fallback down', 502));

    await expect(videoGateway.generateVideo('boom', { quality: 'better' })).rejects.toThrow(
      'fallback down'
    );
    expect(runSpy).toHaveBeenCalledTimes(2);
  });
});

describe('provider instance caching', () => {
  afterEach(() => gateway.resetInstances());

  it('constructs a provider once and reuses it', async () => {
    gateway.resetInstances();

    const first = await gateway.run('VIDEO', 'one', { provider: 'mock' });
    const second = await gateway.run('VIDEO', 'two', { provider: 'mock' });

    expect(first.provider).toBe('mock');
    expect(second.provider).toBe('mock');
    // One cached entry for the module/provider pair, not one per call.
    expect(gateway.instances.size).toBe(1);
    expect(gateway.instances.has('VIDEO:mock')).toBe(true);
  });

  it('caches each module/provider pair separately', async () => {
    gateway.resetInstances();

    await gateway.run('VIDEO', 'clip', { provider: 'mock' });
    await gateway.run('IMAGE', 'picture', { provider: 'mock' });

    expect(gateway.instances.size).toBe(2);
  });
});

describe('tier pricing over HTTP', () => {
  it('publishes the tier catalogue alongside the styles', async () => {
    const { accessToken } = await registerUser();
    const res = await request(app).get('/api/generate/styles').set(auth(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.videoTiers).toHaveLength(4);
    expect(res.body.data.videoTiers[0].id).toBe('low');
    // Unchanged for existing clients.
    expect(res.body.data.costs.VIDEO).toBe(20);
  });

  it.each([
    ['low', 8],
    ['standard', 20],
    ['better', 35],
    ['ultra', 60],
  ])('charges %s at %i credits', async (quality, credits) => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 200);

    const res = await request(app)
      .post('/api/generate/video')
      .set(auth(accessToken))
      .send({ prompt: 'a drone shot', quality });

    expect(res.status).toBe(202);
    expect(res.body.data.quality).toBe(quality);
    expect(res.body.data.credits).toBe(credits);

    const settled = await waitForGeneration(res.body.data.generationId);
    expect(settled.status).toBe('COMPLETED');
    expect(settled.creditsUsed).toBe(credits);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(210 - credits);
  });

  it('rejects an unknown quality before spending anything', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 200);

    const res = await request(app)
      .post('/api/generate/video')
      .set(auth(accessToken))
      .send({ prompt: 'a drone shot', quality: 'cinema-grade' });

    expect(res.status).toBe(400);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(210);
    expect(await prisma.generation.count()).toBe(0);
  });

  it('blocks an expensive tier the user cannot afford but allows a cheaper one', async () => {
    const { user, accessToken } = await registerUser();
    // 10 signup credits: enough for `low` (8), not for `ultra` (60).
    const tooExpensive = await request(app)
      .post('/api/generate/video')
      .set(auth(accessToken))
      .send({ prompt: 'a drone shot', quality: 'ultra' });

    expect(tooExpensive.status).toBe(402);
    expect(tooExpensive.body.error).toMatch(/60 credits/);

    const affordable = await request(app)
      .post('/api/generate/video')
      .set(auth(accessToken))
      .send({ prompt: 'a drone shot', quality: 'low' });

    expect(affordable.status).toBe(202);

    const settled = await waitForGeneration(affordable.body.data.generationId);
    expect(settled.status).toBe('COMPLETED');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(2);
  });

  it('defaults to the standard tier when no quality is given', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);

    const res = await request(app)
      .post('/api/generate/video')
      .set(auth(accessToken))
      .send({ prompt: 'a drone shot' });

    expect(res.body.data.quality).toBe('standard');
    expect(res.body.data.credits).toBe(20);

    // Let the background pipeline finish so it doesn't outlive the test and
    // hold the Jest process open.
    await waitForGeneration(res.body.data.generationId);
  });
});
