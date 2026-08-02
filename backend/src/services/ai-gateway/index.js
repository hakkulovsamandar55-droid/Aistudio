const { selectProvider, describeSelection } = require('./modelSelector');
const videoTiers = require('./videoTiers');
const providerSettings = require('../providerSettings.service');
const logger = require('../../utils/logger');

/**
 * The single door to every AI provider.
 *
 * Callers ask for a module ("give me a VIDEO of X"); the gateway resolves the
 * provider, invokes its interface method, and normalises the response. No
 * caller anywhere else in the codebase imports a provider directly, so
 * swapping Runway for Kling — or adding a whole new module — is contained
 * here plus the registry.
 */
class AIGateway {
  constructor() {
    // Providers hold an axios client and are stateless per request, so one
    // instance per (module, provider) is reused for the process lifetime
    // instead of rebuilding a client on every generation.
    this.instances = new Map();
  }

  getInstance(moduleId, selected) {
    const key = `${moduleId}:${selected.name}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, selected.create());
    }
    return this.instances.get(key);
  }

  /** Drops cached instances — used by tests that mutate provider env vars. */
  resetInstances() {
    this.instances.clear();
  }

  /**
   * @param {string} moduleId - IMAGE | VIDEO | VOICE | MUSIC | SCRIPT
   * @param {string} prompt
   * @param {object} [options] - forwarded to the provider; `options.provider`
   *   forces a specific one (tier routing, tests, admin tooling).
   * @returns {Promise<{ url?: string, text?: string, provider: string }>}
   */
  async run(moduleId, prompt, options = {}) {
    const selected = selectProvider(moduleId, options.provider);
    const instance = this.getInstance(moduleId, selected);

    logger.info(`AI Gateway: ${moduleId} -> ${selected.name}`);

    const result = await instance[selected.method](prompt, options);
    return { ...result, provider: result.provider || selected.name, module: moduleId };
  }

  /**
   * Image-to-image transformation (Remix). Not every image provider
   * implements true img2img, so a provider without `remixImage` degrades to
   * a style-guided `generateImage` call rather than failing the feature —
   * the same "never hard-fail on a missing capability" rule the rest of the
   * gateway follows for missing credentials.
   */
  async runImageRemix(sourceImageUrl, prompt, options = {}) {
    const selected = selectProvider('IMAGE', options.provider);
    const instance = this.getInstance('IMAGE', selected);

    if (typeof instance.remixImage === 'function') {
      logger.info(`AI Gateway: IMAGE remix -> ${selected.name}`);
      const result = await instance.remixImage(sourceImageUrl, prompt, options);
      return { ...result, provider: result.provider || selected.name, module: 'IMAGE' };
    }

    logger.warn(
      `Provider "${selected.name}" has no image-to-image support — falling back to a style-guided generateImage().`
    );
    const result = await instance.generateImage(prompt, options);
    return { ...result, provider: result.provider || selected.name, module: 'IMAGE' };
  }

  /** Which provider each module would use right now. */
  describe() {
    return describeSelection();
  }
}

const gateway = new AIGateway();

// Cached provider instances captured the credentials that were current when
// they were built, so they must be discarded whenever an admin edits them.
providerSettings.onSettingsChange(() => gateway.resetInstances());

/**
 * Runs one video attempt at a specific tier, translating the tier into the
 * provider and model the gateway should use.
 */
async function runTier(prompt, options, tier) {
  const result = await gateway.run('VIDEO', prompt, {
    ...options,
    provider: tier.provider,
    model: tier.model,
    quality: tier.id,
  });

  // The selector falls back when a tier's provider has no credentials. That
  // keeps generation working, but the user was quoted the tier's price, so
  // the mismatch is worth surfacing in the logs.
  if (result.provider !== tier.provider) {
    logger.warn(
      `Video tier "${tier.id}" expected provider "${tier.provider}" but was served by "${result.provider}".`
    );
  }

  return { ...result, quality: tier.id, model: tier.model };
}

// Thin per-module helpers. They exist so call sites read naturally and so
// tests can spy on a single module without reaching into the registry.
const imageGateway = {
  generateImage: (prompt, options) => gateway.run('IMAGE', prompt, options),
  remixImage: (sourceImageUrl, prompt, options) => gateway.runImageRemix(sourceImageUrl, prompt, options),
};

const videoGateway = {
  /**
   * Routes by requested quality rather than by provider name — callers pass
   * `options.quality` ('low' | 'standard' | 'better' | 'ultra') and the tier
   * config decides which provider and model serve it.
   *
   * With VIDEO_TIER_FALLBACK=true a provider failure retries once on the next
   * cheaper tier, so a single vendor outage degrades quality instead of
   * failing the request outright.
   */
  async generateVideo(prompt, options = {}) {
    const tier = videoTiers.resolveTier(options.quality);

    try {
      return await runTier(prompt, options, tier);
    } catch (err) {
      if (!videoTiers.isFallbackEnabled()) throw err;

      const cheaper = videoTiers.lowerTier(tier.id);
      if (!cheaper) throw err;

      logger.warn(
        `Video tier "${tier.id}" failed (${err.message}); falling back to "${cheaper.id}".`
      );
      return runTier(prompt, options, cheaper);
    }
  },
};

const voiceGateway = {
  generateVoice: (prompt, options) => gateway.run('VOICE', prompt, options),
};
const musicGateway = {
  generateMusic: (prompt, options) => gateway.run('MUSIC', prompt, options),
};
const textGateway = {
  generateText: (prompt, options) => gateway.run('SCRIPT', prompt, options),
};

module.exports = {
  gateway,
  imageGateway,
  videoGateway,
  voiceGateway,
  musicGateway,
  textGateway,
};
