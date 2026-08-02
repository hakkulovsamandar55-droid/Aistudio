/**
 * The single registry of AI modules the platform can produce.
 *
 * Adding a future module (avatar, upscaling, translation, ...) means adding
 * one entry here, one provider interface + implementation under
 * `services/ai-gateway/providers/`, and one line in the gateway registry.
 * Nothing in the controllers, planner or credit system needs to change —
 * they all read from this map.
 *
 * `id` values are persisted on Generation.type, so they are part of the data
 * contract: add new ones, never repurpose an existing one.
 */
const MODULES = {
  IMAGE: {
    id: 'IMAGE',
    label: 'Rasm',
    icon: 'image',
    credits: 2,
    // Which env var overrides the provider choice, and what to use by default.
    providerEnv: 'IMAGE_PROVIDER',
    // Roughly how long the module takes, used for UI progress estimates.
    estimatedSeconds: 15,
  },
  VIDEO: {
    id: 'VIDEO',
    label: 'Video',
    icon: 'video',
    credits: 20,
    providerEnv: 'VIDEO_PROVIDER',
    estimatedSeconds: 120,
  },
  VOICE: {
    id: 'VOICE',
    label: 'Ovoz',
    icon: 'voice',
    credits: 3,
    providerEnv: 'VOICE_PROVIDER',
    estimatedSeconds: 20,
  },
  MUSIC: {
    id: 'MUSIC',
    label: 'Musiqa',
    icon: 'music',
    credits: 8,
    providerEnv: 'MUSIC_PROVIDER',
    estimatedSeconds: 60,
  },
  SCRIPT: {
    id: 'SCRIPT',
    label: 'Matn / Ssenariy',
    icon: 'script',
    credits: 1,
    providerEnv: 'TEXT_PROVIDER',
    estimatedSeconds: 8,
  },
};

const MODULE_IDS = Object.keys(MODULES);

function getModule(id) {
  return MODULES[id] || null;
}

function creditCostFor(id) {
  const module = MODULES[id];
  if (!module) {
    throw new Error(`Unknown AI module: ${id}`);
  }
  return module.credits;
}

/** Total credits a list of module ids will cost. */
function estimateCredits(moduleIds) {
  return moduleIds.reduce((total, id) => total + creditCostFor(id), 0);
}

module.exports = { MODULES, MODULE_IDS, getModule, creditCostFor, estimateCredits };
