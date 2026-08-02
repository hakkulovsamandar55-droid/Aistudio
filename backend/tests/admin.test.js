const { app, request, prisma, registerUser, registerAdmin, auth } = require('./helpers');

describe('admin authorization', () => {
  const ADMIN_ROUTES = [
    ['get', '/api/admin/stats'],
    ['get', '/api/admin/users'],
    ['get', '/api/admin/generations'],
    ['get', '/api/admin/packages'],
    ['get', '/api/admin/announcements'],
  ];

  it.each(ADMIN_ROUTES)('rejects an anonymous %s %s with 401', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ROUTES)('rejects a normal user on %s %s with 403', async (method, path) => {
    const { accessToken } = await registerUser();
    const res = await request(app)[method](path).set(auth(accessToken));
    expect(res.status).toBe(403);
  });

  it.each(ADMIN_ROUTES)('allows an admin on %s %s', async (method, path) => {
    const { accessToken } = await registerAdmin();
    const res = await request(app)[method](path).set(auth(accessToken));
    expect(res.status).toBe(200);
  });

  it('revokes access as soon as the role is downgraded, without waiting for token expiry', async () => {
    const admin = await registerAdmin();

    const before = await request(app).get('/api/admin/stats').set(auth(admin.accessToken));
    expect(before.status).toBe(200);

    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'USER' } });

    // Same still-valid token — the middleware must re-check the DB.
    const after = await request(app).get('/api/admin/stats').set(auth(admin.accessToken));
    expect(after.status).toBe(403);
  });
});

describe('admin user management', () => {
  it('grants and deducts credits with an audited transaction', async () => {
    const admin = await registerAdmin();
    const target = await registerUser();

    const grant = await request(app)
      .post(`/api/admin/users/${target.user.id}/credits`)
      .set(auth(admin.accessToken))
      .send({ amount: 50, description: 'goodwill' });

    expect(grant.status).toBe(200);
    expect(grant.body.data.credits).toBe(60);

    const tx = await prisma.creditTransaction.findFirst({
      where: { userId: target.user.id, type: 'ADMIN_ADJUSTMENT' },
    });
    expect(tx.amount).toBe(50);
    expect(tx.description).toBe('goodwill');

    const deduct = await request(app)
      .post(`/api/admin/users/${target.user.id}/credits`)
      .set(auth(admin.accessToken))
      .send({ amount: -10 });
    expect(deduct.body.data.credits).toBe(50);
  });

  it('refuses to deduct more credits than the user holds', async () => {
    const admin = await registerAdmin();
    const target = await registerUser();

    const res = await request(app)
      .post(`/api/admin/users/${target.user.id}/credits`)
      .set(auth(admin.accessToken))
      .send({ amount: -999 });

    expect(res.status).toBe(400);

    const after = await prisma.user.findUnique({ where: { id: target.user.id } });
    expect(after.credits).toBe(10);
  });

  it('suspends a user, which immediately blocks their login', async () => {
    const admin = await registerAdmin();
    const target = await registerUser();

    await request(app)
      .patch(`/api/admin/users/${target.user.id}/active`)
      .set(auth(admin.accessToken))
      .send({ isActive: false });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: target.email, password: target.password });
    expect(login.status).toBe(403);
  });

  it('promotes a user to admin', async () => {
    const admin = await registerAdmin();
    const target = await registerUser();

    await request(app)
      .patch(`/api/admin/users/${target.user.id}/role`)
      .set(auth(admin.accessToken))
      .send({ role: 'ADMIN' });

    const res = await request(app).get('/api/admin/stats').set(auth(target.accessToken));
    expect(res.status).toBe(200);
  });

  it('rejects an invalid role value', async () => {
    const admin = await registerAdmin();
    const target = await registerUser();

    const res = await request(app)
      .patch(`/api/admin/users/${target.user.id}/role`)
      .set(auth(admin.accessToken))
      .send({ role: 'SUPERUSER' });

    expect(res.status).toBe(400);
  });

  it('searches users by email', async () => {
    const admin = await registerAdmin();
    const target = await registerUser({ name: 'Findable Person' });

    const res = await request(app)
      .get(`/api/admin/users?search=${encodeURIComponent(target.email)}`)
      .set(auth(admin.accessToken));

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe(target.email);
  });

  it('never returns password hashes in the user list', async () => {
    const admin = await registerAdmin();
    await registerUser();

    const res = await request(app).get('/api/admin/users').set(auth(admin.accessToken));
    res.body.data.forEach((user) => expect(user.password).toBeUndefined());
  });
});

describe('admin stats', () => {
  it('reports a 7-day trend and a success rate', async () => {
    const admin = await registerAdmin();
    await request(app)
      .post('/api/generate/image')
      .set(auth(admin.accessToken))
      .send({ prompt: 'stats fodder' });

    const res = await request(app).get('/api/admin/stats').set(auth(admin.accessToken));

    expect(res.body.data.trend.signups).toHaveLength(7);
    expect(res.body.data.trend.generations).toHaveLength(7);
    expect(res.body.data.totalGenerations).toBe(1);
    expect(res.body.data.successRate).toBe(100);
    expect(res.body.data.creditsOutstanding).toBeGreaterThan(0);
  });
});

describe('announcements', () => {
  it('shows only active announcements on the public feed', async () => {
    const admin = await registerAdmin();

    const created = await request(app)
      .post('/api/admin/announcements')
      .set(auth(admin.accessToken))
      .send({ message: 'Scheduled maintenance tonight' });
    expect(created.status).toBe(201);

    const visible = await request(app).get('/api/announcements');
    expect(visible.body.data).toHaveLength(1);

    await request(app)
      .patch(`/api/admin/announcements/${created.body.data.id}`)
      .set(auth(admin.accessToken))
      .send({ isActive: false });

    const hidden = await request(app).get('/api/announcements');
    expect(hidden.body.data).toHaveLength(0);
  });

  it('deletes an announcement', async () => {
    const admin = await registerAdmin();
    const created = await request(app)
      .post('/api/admin/announcements')
      .set(auth(admin.accessToken))
      .send({ message: 'Temporary notice' });

    await request(app)
      .delete(`/api/admin/announcements/${created.body.data.id}`)
      .set(auth(admin.accessToken));

    expect(await prisma.announcement.count()).toBe(0);
  });

  it('rejects an empty announcement', async () => {
    const admin = await registerAdmin();
    const res = await request(app)
      .post('/api/admin/announcements')
      .set(auth(admin.accessToken))
      .send({ message: '   ' });

    expect(res.status).toBe(400);
  });
});

describe('admin credit packages', () => {
  it('creates a package and toggles it off the public list', async () => {
    const admin = await registerAdmin();

    const created = await request(app)
      .post('/api/admin/packages')
      .set(auth(admin.accessToken))
      .send({ name: 'Mega', credits: 5000, priceUsd: 99.99, stripePriceId: 'price_mega_test' });
    expect(created.status).toBe(201);

    const publicBefore = await request(app).get('/api/payments/packages');
    expect(publicBefore.body.data).toHaveLength(1);

    await request(app)
      .patch(`/api/admin/packages/${created.body.data.id}`)
      .set(auth(admin.accessToken))
      .send({ isActive: false });

    const publicAfter = await request(app).get('/api/payments/packages');
    expect(publicAfter.body.data).toHaveLength(0);
  });

  it('rejects an incomplete package', async () => {
    const admin = await registerAdmin();
    const res = await request(app)
      .post('/api/admin/packages')
      .set(auth(admin.accessToken))
      .send({ name: 'Broken' });

    expect(res.status).toBe(400);
  });
});
