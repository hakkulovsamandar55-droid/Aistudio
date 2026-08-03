const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const LocalStorageDriver = require('./LocalStorageDriver');
const S3StorageDriver = require('./S3StorageDriver');
const logger = require('../../utils/logger');

/**
 * One place that knows where bytes live.
 *
 * Two things need durable storage, and until now neither had it:
 *  - Remix source uploads, which multer wrote to this server's disk.
 *  - Generation results, which were stored as the *provider's* URL. Those
 *    expire (OpenAI image URLs within the hour, video CDNs not much later),
 *    so a user's library quietly rotted into broken links.
 *
 * With STORAGE_DRIVER=s3 both go to object storage and the URL we hand out is
 * one we control. With the default `local` driver behaviour is unchanged, so
 * dev and the test suite need no credentials.
 */

const UPLOAD_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
};

// A generated 4K video can be large, but not unbounded — this stops a
// misbehaving provider from streaming us out of memory.
const MAX_FETCH_BYTES = 200 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 120000;

let cachedDriver = null;
let cachedDriverKey = null;

function driverName() {
  return (process.env.STORAGE_DRIVER || 'local').toLowerCase();
}

/**
 * Built lazily and re-built when the relevant env changes, so tests can flip
 * drivers without reloading the module.
 */
function getDriver() {
  const name = driverName();
  const key = [name, process.env.S3_BUCKET, process.env.S3_ENDPOINT, process.env.API_PUBLIC_URL].join('|');

  if (cachedDriver && cachedDriverKey === key) return cachedDriver;

  if (name === 's3') {
    const missing = ['S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'].filter((v) => !process.env[v]);
    if (missing.length > 0) {
      // Falling back rather than throwing: a misconfigured bucket should
      // degrade to "files land on disk" instead of taking the API down.
      logger.error(
        `STORAGE_DRIVER=s3 but ${missing.join(', ')} not set — falling back to local disk storage`
      );
      cachedDriver = new LocalStorageDriver({
        root: UPLOAD_ROOT,
        publicBaseUrl: process.env.API_PUBLIC_URL || '',
      });
    } else {
      cachedDriver = new S3StorageDriver({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        accessKey: process.env.S3_ACCESS_KEY,
        secretKey: process.env.S3_SECRET_KEY,
        publicUrl: process.env.S3_PUBLIC_URL,
        signedUrlTtlSeconds: Number(process.env.S3_SIGNED_URL_TTL || 0) || undefined,
      });
    }
  } else {
    cachedDriver = new LocalStorageDriver({
      root: UPLOAD_ROOT,
      publicBaseUrl: process.env.API_PUBLIC_URL || '',
    });
  }

  cachedDriverKey = key;
  return cachedDriver;
}

function extensionFor(contentType, fallback = 'bin') {
  if (!contentType) return fallback;
  return EXTENSION_BY_MIME[contentType.split(';')[0].trim().toLowerCase()] || fallback;
}

/** `generations/2026/08/<uuid>.mp4` — grouped by month so a bucket listing stays usable. */
function buildKey(prefix, extension) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${prefix}/${yyyy}/${mm}/${crypto.randomUUID()}.${extension}`;
}

async function put(key, body, contentType) {
  return getDriver().put(key, body, contentType);
}

async function remove(key) {
  return getDriver().remove(key);
}

/** Stores an in-memory upload (multer memoryStorage) and returns its URL. */
async function putBuffer(buffer, { prefix = 'uploads', contentType } = {}) {
  const key = buildKey(prefix, extensionFor(contentType));
  return put(key, buffer, contentType);
}

/**
 * Copies whatever a provider handed back into our own storage.
 *
 * Handles both shapes providers use: an `https://` URL to fetch, or an inline
 * `data:` payload to decode. Returns null when there is nothing to copy so
 * callers can keep the original value.
 */
async function putFromUrl(sourceUrl, { prefix = 'generations', fallbackExtension = 'bin' } = {}) {
  if (!sourceUrl) return null;

  if (sourceUrl.startsWith('data:')) {
    const [meta, base64] = sourceUrl.split(',');
    if (!base64) return null;
    const contentType = meta.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
    const key = buildKey(prefix, extensionFor(contentType, fallbackExtension));
    return put(key, Buffer.from(base64, 'base64'), contentType);
  }

  if (!/^https?:\/\//i.test(sourceUrl)) return null;

  const response = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
    timeout: FETCH_TIMEOUT_MS,
    maxContentLength: MAX_FETCH_BYTES,
    maxBodyLength: MAX_FETCH_BYTES,
  });

  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const key = buildKey(prefix, extensionFor(contentType, fallbackExtension));
  return put(key, Buffer.from(response.data), contentType);
}

const FALLBACK_EXTENSION_BY_TYPE = {
  IMAGE: 'png',
  VIDEO: 'mp4',
  VOICE: 'mp3',
  MUSIC: 'mp3',
};

/**
 * Best-effort durability for a finished generation: pull the provider's copy
 * into our storage and hand back our URL.
 *
 * Deliberately fails soft. If the copy does not work we return the provider
 * URL unchanged — a link that works for an hour beats losing the generation
 * the user just paid for. The failure is logged so it is still visible.
 */
async function persistGenerationResult(sourceUrl, { type = 'IMAGE' } = {}) {
  if (!sourceUrl) return sourceUrl;

  // Only worth doing against real object storage. Copying onto the same local
  // disk that a redeploy wipes buys no durability — it just fills the disk
  // (and would make dev and the test suite fetch from the network).
  if (driverName() !== 's3') return sourceUrl;

  try {
    const stored = await putFromUrl(sourceUrl, {
      prefix: 'generations',
      fallbackExtension: FALLBACK_EXTENSION_BY_TYPE[type] || 'bin',
    });
    return stored?.url || sourceUrl;
  } catch (err) {
    logger.error(`Could not persist ${type} result to storage, keeping provider URL: ${err.message}`);
    return sourceUrl;
  }
}

/** Reports storage reachability for the health endpoint. */
async function healthCheck() {
  const driver = getDriver();
  if (typeof driver.healthCheck !== 'function') {
    return { driver: driver.name, ok: true };
  }
  try {
    await driver.healthCheck();
    return { driver: driver.name, ok: true };
  } catch (err) {
    return { driver: driver.name, ok: false, error: err.message };
  }
}

module.exports = {
  UPLOAD_ROOT,
  EXTENSION_BY_MIME,
  driverName,
  getDriver,
  buildKey,
  extensionFor,
  put,
  putBuffer,
  putFromUrl,
  persistGenerationResult,
  remove,
  healthCheck,
};
