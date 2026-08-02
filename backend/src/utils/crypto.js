const crypto = require('crypto');

/**
 * Symmetric encryption for provider API keys stored in the database.
 *
 * AES-256-GCM: the auth tag makes tampering detectable, which matters here
 * because a silently corrupted key would look like an auth failure from the
 * vendor and send someone debugging the wrong system.
 *
 * The key comes from SETTINGS_ENCRYPTION_KEY (64 hex chars = 32 bytes).
 * Without it, storing secrets is refused outright rather than falling back to
 * plaintext — a database dump must never contain usable credentials.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

function getKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY is not set — cannot store provider API keys. ' +
        'Generate one with: openssl rand -hex 32'
    );
  }

  const key = Buffer.from(raw.trim(), 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `SETTINGS_ENCRYPTION_KEY must be ${KEY_BYTES} bytes as hex (${KEY_BYTES * 2} characters).`
    );
  }
  return key;
}

/** True when encryption is usable, so callers can degrade gracefully. */
function isEncryptionConfigured() {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/** @returns {string} "iv:authTag:ciphertext", all hex */
function encrypt(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('Nothing to encrypt');
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}

/** @returns {string|null} null when the payload is malformed or tampered with */
function decrypt(payload) {
  if (!payload) return null;

  const parts = String(payload).split(':');
  if (parts.length !== 3) return null;

  try {
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key or tampered ciphertext — treat as "no credential".
    return null;
  }
}

/**
 * Shows enough of a secret to recognise it without revealing it. Used for
 * every API response that mentions a stored key.
 */
function maskSecret(secret) {
  if (!secret) return null;
  if (secret.length <= 8) return '••••';
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

module.exports = { encrypt, decrypt, maskSecret, isEncryptionConfigured };
