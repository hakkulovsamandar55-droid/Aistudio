const { encrypt, decrypt, maskSecret, isEncryptionConfigured } = require('../src/utils/crypto');

describe('crypto util (AES-256-GCM)', () => {
  it('is configured in the test environment', () => {
    expect(isEncryptionConfigured()).toBe(true);
  });

  it('round-trips a plaintext secret', () => {
    const payload = encrypt('sk-test-abcdef1234567890');
    expect(payload.split(':')).toHaveLength(3);
    expect(decrypt(payload)).toBe('sk-test-abcdef1234567890');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encrypt('same-secret');
    const b = encrypt('same-secret');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same-secret');
    expect(decrypt(b)).toBe('same-secret');
  });

  it('detects tampering and returns null instead of garbage', () => {
    const payload = encrypt('sk-test-abcdef1234567890');
    const [iv, tag, data] = payload.split(':');
    // Flip a byte in the ciphertext.
    const tamperedData = data.slice(0, -2) + (data.slice(-2) === '00' ? '01' : '00');
    expect(decrypt([iv, tag, tamperedData].join(':'))).toBeNull();
  });

  it('returns null for malformed payloads', () => {
    expect(decrypt(null)).toBeNull();
    expect(decrypt('')).toBeNull();
    expect(decrypt('not-a-valid-payload')).toBeNull();
  });

  it('masks a secret without revealing it', () => {
    expect(maskSecret('sk-test-abcdef1234567890')).toBe('sk-t••••7890');
    expect(maskSecret('short')).toBe('••••');
    expect(maskSecret(null)).toBeNull();
  });
});
