const { PROVIDERS, hasCredentials } = require('./registry');
const { getModule } = require('../../config/modules.config');
const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');

/**
 * Decides which provider serves a module. The user never picks — that is the
 * product promise — so the rules are:
 *
 *   1. an explicit override passed by the caller (tier routing, tests,
 *      admin tooling) — honoured when that provider has credentials,
 *   2. the module's env var, *if it names a real provider* with credentials,
 *   3. the first registered provider that's enabled with credentials
 *      (admin panel or env — registry order is cheapest-capable first),
 *   4. the mock provider.
 *
 * Step 2 deliberately ignores an env var whose value is "mock": that's the
 * shipped default in .env.example, not an operator's explicit pin. Treating
 * it as a hard request would permanently block every provider enabled later
 * from the admin panel, since a plain "mock" trivially "has credentials". An
 * explicit *override* of "mock" (step 1, e.g. a test asking for it by name)
 * is different and still resolves to mock via the registry lookup below.
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
  const envRequested = module?.providerEnv ? process.env[module.providerEnv] : null;
  const requested = override || (envRequested && envRequested !== 'mock' ? envRequested : null);

  if (requested && registry[requested]) {
    if (hasCredentials(registry[requested], requested)) {
      return { name: requested, ...registry[requested] };
    }
    logger.warn(
      `Provider "${requested}" is configured for ${moduleId} but is disabled or has no credentials — falling back.`
    );
  } else if (requested) {
    logger.warn(`Unknown provider "${requested}" configured for ${moduleId} — falling back.`);
  }

  // Registry order is cheapest-capable first, so the automatic fallback also
  // picks the cheapest enabled provider rather than an arbitrary one.
  const usable = Object.entries(registry).find(
    ([name, entry]) => name !== 'mock' && hasCredentials(entry, name)
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
