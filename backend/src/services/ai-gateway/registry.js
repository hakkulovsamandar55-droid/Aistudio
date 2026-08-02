const MockImageProvider = require('./providers/MockImageProvider');
const MockVideoProvider = require('./providers/MockVideoProvider');
const MockVoiceProvider = require('./providers/MockVoiceProvider');
const MockMusicProvider = require('./providers/MockMusicProvider');
const MockTextProvider = require('./providers/MockTextProvider');
const OpenAIImageProvider = require('./providers/OpenAIImageProvider');
const OpenAITextProvider = require('./providers/OpenAITextProvider');
const RunwayVideoProvider = require('./providers/RunwayVideoProvider');
const KlingVideoProvider = require('./providers/KlingVideoProvider');
const WanVideoProvider = require('./providers/WanVideoProvider');
const VeoVideoProvider = require('./providers/VeoVideoProvider');
const ElevenLabsVoiceProvider = require('./providers/ElevenLabsVoiceProvider');
const SunoMusicProvider = require('./providers/SunoMusicProvider');
const providerSettings = require('../providerSettings.service');

const { PROVIDER_CATALOG } = providerSettings;

/**
 * Every provider the platform can route to, grouped by module.
 *
 * `requiresEnv` lets the selector skip a provider whose credentials are
 * missing instead of calling it and failing — that is what makes the
 * "user never picks the AI" promise safe to keep.
 *
 * `method` is the interface method the gateway invokes, so all modules can
 * share a single dispatch path.
 */
const PROVIDERS = {
  IMAGE: {
    openai: {
      label: 'OpenAI',
      method: 'generateImage',
      requiresEnv: ['OPENAI_API_KEY'],
      create: () => new OpenAIImageProvider(),
    },
    mock: {
      label: 'Mock',
      method: 'generateImage',
      requiresEnv: [],
      create: () => new MockImageProvider(),
    },
  },
  // Ordered cheapest-capable first; see videoTiers.js for the quality tiers
  // that map onto these providers.
  VIDEO: {
    wan: {
      label: 'Wan (DashScope)',
      method: 'generateVideo',
      requiresEnv: ['WAN_API_KEY'],
      create: () => new WanVideoProvider(),
    },
    kling: {
      label: 'Kling',
      method: 'generateVideo',
      requiresEnv: ['KLING_API_KEY'],
      create: () => new KlingVideoProvider(),
    },
    runway: {
      label: 'Runway ML',
      method: 'generateVideo',
      requiresEnv: ['RUNWAY_API_KEY'],
      create: () => new RunwayVideoProvider(),
    },
    veo: {
      label: 'Google Veo',
      method: 'generateVideo',
      requiresEnv: ['VEO_API_KEY'],
      create: () => new VeoVideoProvider(),
    },
    mock: {
      label: 'Mock',
      method: 'generateVideo',
      requiresEnv: [],
      create: () => new MockVideoProvider(),
    },
  },
  VOICE: {
    elevenlabs: {
      label: 'ElevenLabs',
      method: 'generateVoice',
      requiresEnv: ['ELEVENLABS_API_KEY'],
      create: () => new ElevenLabsVoiceProvider(),
    },
    mock: {
      label: 'Mock',
      method: 'generateVoice',
      requiresEnv: [],
      create: () => new MockVoiceProvider(),
    },
  },
  MUSIC: {
    suno: {
      label: 'Suno',
      method: 'generateMusic',
      requiresEnv: ['SUNO_API_KEY'],
      create: () => new SunoMusicProvider(),
    },
    mock: {
      label: 'Mock',
      method: 'generateMusic',
      requiresEnv: [],
      create: () => new MockMusicProvider(),
    },
  },
  SCRIPT: {
    openai: {
      label: 'OpenAI',
      method: 'generateText',
      requiresEnv: ['OPENAI_API_KEY'],
      create: () => new OpenAITextProvider(),
    },
    mock: {
      label: 'Mock',
      method: 'generateText',
      requiresEnv: [],
      create: () => new MockTextProvider(),
    },
  },
};

/**
 * A provider is usable when it holds a credential *and* an operator hasn't
 * switched it off. Credentials may come from the admin panel or the
 * environment; `requiresEnv` is retained as the env-only fallback for
 * providers with no settings row.
 */
function hasCredentials(entry, providerName) {
  if (providerName && PROVIDER_CATALOG[providerName]) {
    return providerSettings.isEnabled(providerName);
  }
  return (entry.requiresEnv || []).every((key) => Boolean(process.env[key]));
}

module.exports = { PROVIDERS, hasCredentials };
