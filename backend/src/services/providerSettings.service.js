const prisma = require('../config/db');
const { encrypt, decrypt, maskSecret, isEncryptionConfigured } = require('../utils/crypto');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Runtime credentials and availability for every AI provider.
 *
 * Precedence is deliberate: a value set in the admin panel wins over the
 * environment, so an operator can rotate a key without a redeploy, while a
 * fresh install still boots from .env alone.
 *
 * Reads happen inside provider constructors, which are synchronous, so the
 * table is mirrored into an in-memory map. The cache is refreshed at boot and
 * invalidated on every write.
 */

/** Every provider the platform can hold credentials for. */
const PROVIDER_CATALOG = {
  openai: { label: 'OpenAI', modules: ['IMAGE', 'SCRIPT'], envKey: 'OPENAI_API_KEY', envBaseUrl: null },
  wan: { label: 'Wan (DashScope)', modules: ['VIDEO'], envKey: 'WAN_API_KEY', envBaseUrl: 'WAN_API_BASE_URL' },
  kling: { label: 'Kling', modules: ['VIDEO'], envKey: 'KLING_API_KEY', envBaseUrl: 'KLING_API_BASE_URL' },
  runway: { label: 'Runway ML', modules: ['VIDEO'], envKey: 'RUNWAY_API_KEY', envBaseUrl: 'RUNWAY_API_BASE_URL' },
  veo: { label: 'Google Veo', modules: ['VIDEO'], envKey: 'VEO_API_KEY', envBaseUrl: 'VEO_API_BASE_URL' },
  elevenlabs: {
    label: 'ElevenLabs',
    modules: ['VOICE'],
    envKey: 'ELEVENLABS_API_KEY',
    envBaseUrl: 'ELEVENLABS_API_BASE_URL',
  },
  suno: { label: 'Suno', modules: ['MUSIC'], envKey: 'SUNO_API_KEY', envBaseUrl: 'SUNO_API_BASE_URL' },
};

const PROVIDER_NAMES = Object.keys(PROVIDER_CATALOG);

/** provider -> { apiKey, baseUrl, isEnabled, source } */
let cache = new Map();
let loaded = false;

/**
 * Notified whenever settings change. The gateway registers here to drop its
 * cached provider instances, which hold the old credentials — a listener
 * rather than a direct import, so this module stays free of gateway
 * dependencies.
 */
const changeListeners = [];

function onSettingsChange(listener) {
  changeListeners.push(listener);
}

function notifyChanged() {
  changeListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      logger.warn(`Provider settings listener failed: ${err.message}`);
    }
  });
}

function envCredential(provider) {
  const meta = PROVIDER_CATALOG[provider];
  if (!meta) return { apiKey: null, baseUrl: null };
  return {
    apiKey: process.env[meta.envKey] || null,
    baseUrl: meta.envBaseUrl ? process.env[meta.envBaseUrl] || null : null,
  };
}

async function refresh() {
  try {
    const rows = await prisma.providerSetting.findMany();
    const next = new Map();

    for (const row of rows) {
      next.set(row.provider, {
        apiKey: row.apiKeyEnc ? decrypt(row.apiKeyEnc) : null,
        baseUrl: row.baseUrl || null,
        isEnabled: row.isEnabled,
      });
    }

    cache = next;
    loaded = true;
  } catch (err) {
    // A missing table (pre-migration) or an unreachable DB must not stop the
    // app booting — env credentials still work.
    logger.warn(`Could not load provider settings, falling back to env: ${err.message}`);
    loaded = true;
  }
}

function invalidate() {
  loaded = false;
}

/**
 * Resolved credential for a provider. Synchronous by design so providers can
 * call it from their constructors.
 */
function getCredential(provider) {
  const stored = cache.get(provider);
  const env = envCredential(provider);

  return {
    apiKey: stored?.apiKey || env.apiKey,
    baseUrl: stored?.baseUrl || env.baseUrl,
    source: stored?.apiKey ? 'admin' : env.apiKey ? 'env' : 'none',
  };
}

function getApiKey(provider) {
  return getCredential(provider).apiKey;
}

function getBaseUrl(provider, fallback) {
  return getCredential(provider).baseUrl || fallback;
}

/**
 * Whether the platform may route to a provider.
 *
 * A row in the table is an explicit operator decision and is honoured as-is.
 * With no row, the provider is usable when the environment supplies a key —
 * that keeps .env-only deployments working exactly as before.
 */
function isEnabled(provider) {
  const stored = cache.get(provider);
  if (stored) return stored.isEnabled && Boolean(stored.apiKey || envCredential(provider).apiKey);
  return Boolean(envCredential(provider).apiKey);
}

/** Admin-facing view. Keys are always masked — plaintext never leaves here. */
async function list() {
  await refresh();

  return PROVIDER_NAMES.map((provider) => {
    const meta = PROVIDER_CATALOG[provider];
    const credential = getCredential(provider);
    const stored = cache.get(provider);

    return {
      provider,
      label: meta.label,
      modules: meta.modules,
      hasKey: Boolean(credential.apiKey),
      maskedKey: maskSecret(credential.apiKey),
      keySource: credential.source,
      baseUrl: credential.baseUrl,
      isEnabled: isEnabled(provider),
      configuredInDb: Boolean(stored),
      notes: null,
    };
  });
}

async function update(provider, { apiKey, baseUrl, isEnabled: enabled, notes }) {
  if (!PROVIDER_CATALOG[provider]) {
    throw new AppError(`Unknown provider: ${provider}`, 400);
  }

  const data = {};

  if (apiKey !== undefined) {
    if (apiKey === null || apiKey === '') {
      // Explicit clear — drop back to whatever the environment provides.
      data.apiKeyEnc = null;
    } else {
      if (!isEncryptionConfigured()) {
        throw new AppError(
          'SETTINGS_ENCRYPTION_KEY is not configured on the server, so API keys cannot be stored securely.',
          503
        );
      }
      data.apiKeyEnc = encrypt(String(apiKey).trim());
    }
  }

  if (baseUrl !== undefined) data.baseUrl = baseUrl ? String(baseUrl).trim() : null;
  if (enabled !== undefined) data.isEnabled = Boolean(enabled);
  if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;

  await prisma.providerSetting.upsert({
    where: { provider },
    update: data,
    create: { provider, isEnabled: false, ...data },
  });

  invalidate();
  await refresh();
  notifyChanged();

  return list().then((all) => all.find((entry) => entry.provider === provider));
}

/** Called once at startup; safe to call again. */
async function init() {
  if (!loaded) await refresh();
}

module.exports = {
  PROVIDER_CATALOG,
  PROVIDER_NAMES,
  init,
  refresh,
  invalidate,
  onSettingsChange,
  getCredential,
  getApiKey,
  getBaseUrl,
  isEnabled,
  list,
  update,
};
