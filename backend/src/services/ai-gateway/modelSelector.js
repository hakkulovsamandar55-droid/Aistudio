const { PROVIDERS, hasCredentials } = require('./registry');
const { getModule } = require('../../config/modules.config');
const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');

/**
 * Decides which provider serves a module. The user never picks — that is the
 * product promise — so the rules are:
 *
 *   1. an explicit override (used by tests and admin tooling),
 *   2. the module's env var, if that provider's credentials are present,
 *   3. the first registered provider whose credentials are present,
 *   4. the mock provider.
 *
 * Falling back instead of throwing means a missing or revoked key degrades
 * the output rather than taking the whole feature offline.
 */
function selectProvider(moduleId, override) {
  const registry = PROVIDERS[moduleId];
  if (!registry) {
    throw new AppError(`No providers registered for module ${moduleId}`, 500);
  }

  const module = getModule(moduleId);
  const requested = override || (module?.providerEnv ? process.env[module.providerEnv] : null);

  if (requested && registry[requested]) {
    if (hasCredentials(registry[requested])) {
      return { name: requested, ...registry[requested] };
    }
    logger.warn(
      `Provider "${requested}" is configured for ${moduleId} but its credentials are missing — falling back.`
    );
  } else if (requested) {
    logger.warn(`Unknown provider "${requested}" configured for ${moduleId} — falling back.`);
  }

  const usable = Object.entries(registry).find(
    ([name, entry]) => name !== 'mock' && hasCredentials(entry)
  );
  if (usable) {
    return { name: usable[0], ...usable[1] };
  }

  return { name: 'mock', ...registry.mock };
}

/** What the platform would pick right now, for every module. Used by /api/modules. */
function describeSelection() {
  return Object.keys(PROVIDERS).map((moduleId) => {
    const selected = selectProvider(moduleId);
    return {
      module: moduleId,
      provider: selected.name,
      label: selected.label,
      live: selected.name !== 'mock',
    };
  });
}

module.exports = { selectProvider, describeSelection };
