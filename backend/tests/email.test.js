const axios = require('axios');
const { request, app, prisma, registerUser } = require('./helpers');
const emailService = require('../src/services/email.service');

// The service talks to Resend over plain HTTP, so intercepting axios.post is
// enough to see exactly what would go over the wire — no network, no key.
jest.mock('axios');

const ORIGINAL_ENV = { ...process.env };

function lastCall() {
  return axios.post.mock.calls[axios.post.mock.calls.length - 1];
}

/** The service is fire-and-forget, so give its unawaited promise a tick. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: { id: 'email_123' } });
  process.env.EMAIL_PROVIDER_API_KEY = 'test_resend_key';
  process.env.EMAIL_FROM_ADDRESS = 'AI Studio <hello@aistudio.test>';
  process.env.FRONTEND_URL = 'https://app.aistudio.test';
});

afterEach(() => {
  process.env.EMAIL_PROVIDER_API_KEY = ORIGINAL_ENV.EMAIL_PROVIDER_API_KEY || '';
  process.env.EMAIL_FROM_ADDRESS = ORIGINAL_ENV.EMAIL_FROM_ADDRESS || '';
  process.env.FRONTEND_URL = ORIGINAL_ENV.FRONTEND_URL || '';
});

describe('email service', () => {
  it('sends nothing and reports why when no API key is configured', async () => {
    process.env.EMAIL_PROVIDER_API_KEY = '';

    expect(emailService.isConfigured()).toBe(false);
    const result = await emailService.send({ to: 'a@b.test', subject: 'x', html: '<p>x</p>' });

    expect(result).toEqual({ sent: false, reason: 'not_configured' });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('posts to Resend with the configured sender and a bearer token', async () => {
    await emailService.send({ to: 'user@test.dev', subject: 'Subject line', html: '<p>hi</p>' });

    const [url, body, config] = lastCall();
    expect(url).toBe('https://api.resend.com/emails');
    expect(body).toEqual({
      from: 'AI Studio <hello@aistudio.test>',
      to: ['user@test.dev'],
      subject: 'Subject line',
      html: '<p>hi</p>',
    });
    expect(config.headers.Authorization).toBe('Bearer test_resend_key');
  });

  it('builds a password reset link pointing at the frontend with the raw token', async () => {
    await emailService.sendPasswordResetEmail({ email: 'reset@test.dev', name: 'Aziz' }, 'raw-token-abc');

    const [, body] = lastCall();
    expect(body.to).toEqual(['reset@test.dev']);
    expect(body.html).toContain('https://app.aistudio.test/reset-password?token=raw-token-abc');
    expect(body.html).toContain('Aziz');
  });

  it('includes package, credits and amount in a payment receipt', async () => {
    await emailService.sendPaymentReceiptEmail(
      { email: 'buyer@test.dev', name: 'Buyer' },
      { packageName: 'Starter', credits: 100, amountUsd: 9.99 }
    );

    const [, body] = lastCall();
    expect(body.html).toContain('Starter');
    expect(body.html).toContain('+100');
    expect(body.html).toContain('$9.99');
  });

  it('never throws when the provider fails — the caller must not be affected', async () => {
    axios.post.mockRejectedValue({ response: { data: { message: 'domain not verified' } } });

    const result = await emailService.send({ to: 'a@b.test', subject: 'x', html: '<p>x</p>' });

    expect(result.sent).toBe(false);
    expect(result.error).toBe('domain not verified');
  });
});

describe('email wired into the app', () => {
  it('sends a welcome email on registration', async () => {
    const { user } = await registerUser();
    await flush();

    const welcome = axios.post.mock.calls.find((call) => call[1].to[0] === user.email);
    expect(welcome).toBeDefined();
    expect(welcome[1].subject).toMatch(/xush kelibsiz/i);
  });

  it('sends a reset email and stops returning the token once mail is configured', async () => {
    const { user } = await registerUser();
    axios.post.mockClear();

    const res = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    await flush();

    expect(res.status).toBe(200);
    // With a provider configured the token must only reach the inbox.
    expect(res.body.data.devResetToken).toBeUndefined();

    const [, body] = lastCall();
    expect(body.to).toEqual([user.email]);
    expect(body.html).toMatch(/reset-password\?token=[a-f0-9]{64}/);
  });

  it('registration still succeeds when the mail provider is down', async () => {
    axios.post.mockRejectedValue(new Error('resend unreachable'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'resilient@test.dev', password: 'password123', name: 'Resilient' });
    await flush();

    expect(res.status).toBe(201);
    const created = await prisma.user.findUnique({ where: { email: 'resilient@test.dev' } });
    expect(created).not.toBeNull();
  });
});
