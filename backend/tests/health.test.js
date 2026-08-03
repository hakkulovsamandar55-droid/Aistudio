const { request, app, prisma } = require('./helpers');

/**
 * "The process is listening" is not "the app works" — a server that can't
 * reach Postgres answers a naive ping happily while failing every real
 * request. These tests pin down that the check actually touches its
 * dependencies and reports 503 when a required one is down.
 */
describe('health checks', () => {
  it('reports ok with per-dependency detail', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database.ok).toBe(true);
    expect(res.body.checks).toHaveProperty('redis');
    expect(res.body.checks).toHaveProperty('storage');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('is also mounted at /health for load balancers', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.checks.database.ok).toBe(true);
  });

  it('answers liveness without touching any dependency', async () => {
    const spy = jest.spyOn(prisma, '$queryRaw');

    const res = await request(app).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not fail the check for optional dependencies that are simply off', async () => {
    // No REDIS_URL and STORAGE_DRIVER=local in the test env: both are absent
    // by choice, which is a deployment decision rather than an outage.
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.checks.redis.configured).toBe(false);
    expect(res.body.checks.storage.driver).toBe('local');
  });

  it('returns 503 when the database is unreachable', async () => {
    const spy = jest
      .spyOn(prisma, '$queryRaw')
      .mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database.ok).toBe(false);
    expect(res.body.checks.database.error).toContain('connection refused');

    spy.mockRestore();
  });
});
