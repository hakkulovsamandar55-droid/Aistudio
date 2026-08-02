/**
 * What each generation actually costs us, and what we charge for it.
 *
 * These figures drive the admin margin report. They are estimates from
 * published vendor pricing, not billed amounts — treat the report as a
 * planning tool, and reconcile against real invoices before making pricing
 * decisions on it.
 *
 * Strategy (deliberately conservative while the user base is small):
 *   - default to the cheapest capable provider for every module,
 *   - keep premium vendors implemented but switched off until paying volume
 *     justifies them,
 *   - keep the free tier tight, because unpaid usage is pure cost.
 */

/** Estimated USD cost of one unit of output, per provider. */
const PROVIDER_UNIT_COST_USD = {
  // Video, per 5-second clip.
  wan: 0.28,
  kling: 0.3,
  runway: 0.75,
  veo: 2.0,

  // One image.
  openai_image: 0.012,

  // One short voice line (~500 characters).
  elevenlabs: 0.025,

  // One music track.
  suno: 0.05,

  // One text completion.
  openai_text: 0.002,

  // Mocks cost nothing, which keeps the report honest in demo mode.
  mock: 0,
};

/** Which cost entry applies to a given module/provider pair. */
function unitCostFor(moduleId, provider) {
  if (provider === 'mock') return 0;

  if (moduleId === 'IMAGE') return PROVIDER_UNIT_COST_USD.openai_image ?? 0;
  if (moduleId === 'SCRIPT') return PROVIDER_UNIT_COST_USD.openai_text ?? 0;
  if (moduleId === 'VOICE') return PROVIDER_UNIT_COST_USD.elevenlabs ?? 0;
  if (moduleId === 'MUSIC') return PROVIDER_UNIT_COST_USD.suno ?? 0;

  return PROVIDER_UNIT_COST_USD[provider] ?? 0;
}

/**
 * What a credit is worth in USD, derived from the entry credit pack
 * ($4.99 for 100 credits). Used to value credit spend against provider cost.
 */
const USD_PER_CREDIT = 4.99 / 100;

/**
 * Free-tier daily caps. The point is to let someone try the product without
 * letting unpaid usage become the dominant cost line — video especially,
 * since one clip costs more than an entire month of image generation.
 */
const FREE_TIER_DAILY_LIMITS = {
  VIDEO: 1,
  IMAGE: 2,
  VOICE: 2,
  MUSIC: 1,
  SCRIPT: 10,
};

/**
 * The single paid plan. One tier is enough to start; more can be added when
 * there is evidence about what people actually buy.
 */
const PLANS = {
  FREE: {
    id: 'FREE',
    label: 'Bepul',
    priceUsd: 0,
    monthlyCredits: 0,
    dailyLimits: FREE_TIER_DAILY_LIMITS,
    description: "Sinab ko'rish uchun — kuniga 1 video va 2 rasm",
  },
  PRO: {
    id: 'PRO',
    label: 'Pro',
    priceUsd: 4.99,
    // 15 videos (15 x 20) + 30 images (30 x 2) = 360 credits.
    monthlyCredits: 360,
    dailyLimits: null,
    description: "Oyiga ~15 video va 30 rasm, kunlik cheklovsiz",
  },
};

function planFor(planId) {
  return PLANS[planId] || PLANS.FREE;
}

function dailyLimitFor(planId, moduleId) {
  const limits = planFor(planId).dailyLimits;
  if (!limits) return null; // unlimited
  return limits[moduleId] ?? null;
}

module.exports = {
  PROVIDER_UNIT_COST_USD,
  unitCostFor,
  USD_PER_CREDIT,
  FREE_TIER_DAILY_LIMITS,
  PLANS,
  planFor,
  dailyLimitFor,
};
