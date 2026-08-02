const { app, request, prisma, uniqueEmail, registerUser, auth } = require('./helpers');

describe('auth', () => {
  it('registers a user with the signup bonus and a referral code', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.credits).toBe(10);
    expect(res.body.data.user.referralCode).toHaveLength(8);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('records the signup bonus as a credit transaction', async () => {
    const { user } = await registerUser();
    const transactions = await prisma.creditTransaction.findMany({ where: { userId: user.id } });

    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe('SIGNUP_BONUS');
    expect(transactions[0].amount).toBe(10);
  });

  it('rejects a duplicate email', async () => {
    const { email } = await registerUser();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Dup' });

    expect(res.status).toBe(409);
  });

  it.each([
    ['bad email', { email: 'not-an-email', password: 'password123', name: 'X' }],
    ['short password', { email: 'ok@example.com', password: 'short', name: 'X' }],
    ['missing name', { email: 'ok2@example.com', password: 'password123', name: '' }],
  ])('rejects registration with %s', async (_label, payload) => {
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(400);
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    const { email, password } = await registerUser();

    const ok = await request(app).post('/api/auth/login').send({ email, password });
    expect(ok.status).toBe(200);

    const bad = await request(app).post('/api/auth/login').send({ email, password: 'wrongpassword' });
    expect(bad.status).toBe(401);
  });

  it('does not reveal whether an email exists on failed login', async () => {
    const { email, password } = await registerUser();

    const wrongPassword = await request(app).post('/api/auth/login').send({ email, password: 'nope12345' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password });

    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });

  it('blocks a suspended account from logging in', async () => {
    const { user, email, password } = await registerUser();
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(403);
  });

  it('exchanges a refresh token for a new access token', async () => {
    const { refreshToken } = await registerUser();

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('rejects a garbage refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not.a.token' });
    expect(res.status).toBe(401);
  });

  it('requires a token on protected routes', async () => {
    expect((await request(app).get('/api/users/me')).status).toBe(401);
    expect((await request(app).get('/api/users/me').set(auth('bogus'))).status).toBe(401);
  });
});

describe('password reset', () => {
  it('completes the full reset flow and invalidates the token afterwards', async () => {
    const { email } = await registerUser();

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);

    const token = forgot.body.data.devResetToken;
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'brandnewpass' });
    expect(reset.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'brandnewpass' });
    expect(login.status).toBe(200);

    // Single use: replaying the same token must fail.
    const replay = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'yetanotherpass' });
    expect(replay.status).toBe(400);
  });

  it('stores only a hash of the reset token', async () => {
    const { email } = await registerUser();
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    const token = forgot.body.data.devResetToken;

    const stored = await prisma.passwordResetToken.findFirst();
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toHaveLength(64);
  });

  it('rejects an expired token', async () => {
    const { email } = await registerUser();
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    const token = forgot.body.data.devResetToken;

    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'expiredattempt' });
    expect(res.status).toBe(400);
  });

  it('returns 200 for an unknown email so addresses cannot be enumerated', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.devResetToken).toBeUndefined();
  });
});

describe('change password', () => {
  it('requires the correct current password', async () => {
    const { accessToken } = await registerUser();

    const wrong = await request(app)
      .post('/api/users/me/password')
      .set(auth(accessToken))
      .send({ currentPassword: 'incorrect', newPassword: 'replacement1' });
    expect(wrong.status).toBe(401);

    const right = await request(app)
      .post('/api/users/me/password')
      .set(auth(accessToken))
      .send({ currentPassword: 'password123', newPassword: 'replacement1' });
    expect(right.status).toBe(200);
  });

  it('voids outstanding reset links when the password is changed', async () => {
    const { email, accessToken } = await registerUser();
    await request(app).post('/api/auth/forgot-password').send({ email });

    await request(app)
      .post('/api/users/me/password')
      .set(auth(accessToken))
      .send({ currentPassword: 'password123', newPassword: 'replacement1' });

    const stored = await prisma.passwordResetToken.findFirst();
    expect(stored.usedAt).not.toBeNull();
  });
});
