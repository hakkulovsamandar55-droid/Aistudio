const providerSettings = require('../src/services/providerSettings.service');

const ENV_KEY = 'WAN_API_KEY';

describe('providerSettings service', () => {
  const originalEnvValue = process.env[ENV_KEY];

  afterEach(() => {
    if (originalEnvValue === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalEnvValue;
    providerSettings.invalidate();
  });

  it('falls back to the env var when no admin row exists', async () => {
    process.env[ENV_KEY] = 'env-wan-key';
    await providerSettings.refresh();

    const credential = providerSettings.getCredential('wan');
    expect(credential.apiKey).toBe('env-wan-key');
    expect(credential.source).toBe('env');
    expect(providerSettings.isEnabled('wan')).toBe(true);
  });

  it('is disabled with no admin row and no env var', async () => {
    delete process.env[ENV_KEY];
    await providerSettings.refresh();

    expect(providerSettings.getApiKey('wan')).toBeNull();
    expect(providerSettings.isEnabled('wan')).toBe(false);
  });

  it('an admin-set key takes precedence over the env var', async () => {
    process.env[ENV_KEY] = 'env-wan-key';
    await providerSettings.update('wan', { apiKey: 'admin-wan-key', isEnabled: true });

    const credential = providerSettings.getCredential('wan');
    expect(credential.apiKey).toBe('admin-wan-key');
    expect(credential.source).toBe('admin');
    expect(providerSettings.isEnabled('wan')).toBe(true);
  });

  it('a disabled provider is not usable even with a stored key', async () => {
    await providerSettings.update('wan', { apiKey: 'admin-wan-key', isEnabled: false });
    expect(providerSettings.isEnabled('wan')).toBe(false);
  });

  it('clearing the stored key falls back to the env var again', async () => {
    process.env[ENV_KEY] = 'env-wan-key';
    await providerSettings.update('wan', { apiKey: 'admin-wan-key', isEnabled: true });
    expect(providerSettings.getApiKey('wan')).toBe('admin-wan-key');

    await providerSettings.update('wan', { apiKey: null, isEnabled: true });
    expect(providerSettings.getCredential('wan').source).toBe('env');
    expect(providerSettings.getApiKey('wan')).toBe('env-wan-key');
  });

  it('list() returns masked keys only, never plaintext', async () => {
    await providerSettings.update('wan', { apiKey: 'admin-wan-key-1234', isEnabled: true });
    const all = await providerSettings.list();
    const wan = all.find((entry) => entry.provider === 'wan');

    expect(wan.hasKey).toBe(true);
    expect(wan.maskedKey).not.toContain('admin-wan-key-1234');
    expect(wan.maskedKey).toMatch(/••••/);
    expect(JSON.stringify(all)).not.toContain('admin-wan-key-1234');
  });

  it('rejects an unknown provider', async () => {
    await expect(providerSettings.update('not-a-real-provider', { apiKey: 'x' })).rejects.toThrow(
      'Unknown provider'
    );
  });
});
