// Named with a `mock` prefix so Jest's hoisting allows the jest.mock()
// factory below to reference it despite being declared after the call.
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

const { app, request, prisma, uniqueEmail, registerUser, auth } = require('./helpers');

function mockGooglePayload(overrides = {}) {
  return {
    sub: 'google-sub-1',
    email: 'googler@example.com',
    email_verified: true,
    name: 'Googler',
    ...overrides,
  };
}

describe('Google sign-in', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    mockVerifyIdToken.mockReset();
  });

  afterAll(() => {
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalClientId;
  });

  it('creates a new account on first sign-in, with the signup bonus', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => mockGooglePayload() });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'raw-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('googler@example.com');
    expect(res.body.data.user.credits).toBe(10);
    expect(res.body.data.accessToken).toBeTruthy();

    const stored = await prisma.user.findUnique({ where: { email: 'googler@example.com' } });
    expect(stored.googleId).toBe('google-sub-1');
    expect(stored.password).toBeNull();
  });

  it('signs the same Google user back in without creating a second account', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => mockGooglePayload() });

    const first = await request(app).post('/api/auth/google').send({ idToken: 'token-1' });
    const second = await request(app).post('/api/auth/google').send({ idToken: 'token-2' });

    expect(first.body.data.user.id).toBe(second.body.data.user.id);

    const count = await prisma.user.count({ where: { email: 'googler@example.com' } });
    expect(count).toBe(1);
  });

  it('links a Google identity onto an existing password account with the same email', async () => {
    const { email, user } = await registerUser({ email: uniqueEmail('linkme') });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => mockGooglePayload({ sub: 'google-sub-2', email }),
    });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'token' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored.googleId).toBe('google-sub-2');
    // The password from the original registration must survive the link.
    expect(stored.password).toBeTruthy();
  });

  it('rejects an unverified Google email', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => mockGooglePayload({ email_verified: false }),
    });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    expect(res.status).toBe(401);
  });

  it('rejects a token that fails verification', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad signature'));

    const res = await request(app).post('/api/auth/google').send({ idToken: 'garbage' });
    expect(res.status).toBe(401);
  });

  it('requires an idToken', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
  });

  it('returns 503 when Google sign-in is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    expect(res.status).toBe(503);
  });

  it('a linked Google account can still log in with its original password', async () => {
    const { email, password } = await registerUser({ email: uniqueEmail('bothways') });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => mockGooglePayload({ sub: 'google-sub-3', email }),
    });
    await request(app).post('/api/auth/google').send({ idToken: 'token' });

    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
  });

  it('a Google-only account cannot log in with a password', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => mockGooglePayload({ email: 'nopass@example.com' }),
    });
    await request(app).post('/api/auth/google').send({ idToken: 'token' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nopass@example.com', password: 'anything123' });
    expect(res.status).toBe(401);
  });

  it('a Google-only account gets a clear error trying to change its (nonexistent) password', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => mockGooglePayload({ email: 'nopass2@example.com' }),
    });
    const login = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    const { accessToken } = login.body.data;

    const res = await request(app)
      .post('/api/users/me/password')
      .set(auth(accessToken))
      .send({ currentPassword: 'x', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
  });
});
