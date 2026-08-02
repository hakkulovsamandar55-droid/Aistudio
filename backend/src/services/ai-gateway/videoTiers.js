/**
 * Quality-tier routing for video generation.
 *
 * A tier is the user-facing choice ("standard", "ultra"); it maps to a
 * provider, a model on that provider, and a credit price. Callers never name
 * a provider — they name a quality, exactly as the platform promises.
 *
 * Provider ids here must exist in the VIDEO section of the gateway registry;
 * the registry stays the single source of truth for how a provider is
 * constructed and which credentials it needs.
 *
 * `standard` deliberately costs the same 20 credits video has always cost, so
 * introducing tiers does not silently reprice existing behaviour.
 */

const VIDEO_TIERS = {
  low: {
    id: 'low',
    label: 'Tezkor',
    description: "Eng tez va arzon — qoralama va sinov uchun",
    provider: 'wan',
    model: 'wan2.2-t2v-plus',
    credits: 8,
    estimatedSeconds: 45,
    maxDuration: 5,
  },
  standard: {
    id: 'standard',
    label: 'Standart',
    description: "Kundalik kontent uchun muvozanatli sifat",
    provider: 'kling',
    model: 'kling-v2-master',
    credits: 20,
    estimatedSeconds: 120,
    maxDuration: 5,
  },
  better: {
    id: 'better',
    label: 'Yuqori',
    description: 'Silliq harakat va yaxshi detallar',
    provider: 'runway',
    model: 'gen4_turbo',
    credits: 35,
    estimatedSeconds: 180,
    maxDuration: 10,
  },
  ultra: {
    id: 'ultra',
    label: 'Ultra',
    description: 'Eng yuqori sifat — tayyor reklama darajasida',
    provider: 'veo',
    model: 'veo-3.0-generate-001',
    credits: 60,
    estimatedSeconds: 300,
    maxDuration: 8,
  },
};

/** Cheapest first. Fallback walks this array backwards. */
const TIER_ORDER = ['low', 'standard', 'better', 'ultra'];

const DEFAULT_TIER = 'standard';

function isValidTier(quality) {
  return typeof quality === 'string' && Object.prototype.hasOwnProperty.call(VIDEO_TIERS, quality);
}

/**
 * Resolves a requested quality to a tier. An absent or unrecognised value
 * falls back to the default rather than erroring, so an outdated client can
 * never block a generation.
 */
function resolveTier(quality) {
  return VIDEO_TIERS[isValidTier(quality) ? quality : DEFAULT_TIER];
}

function creditCostForQuality(quality) {
  return resolveTier(quality).credits;
}

/**
 * The next cheaper tier, or null at the bottom. Used by the optional
 * degrade-on-failure path.
 */
function lowerTier(quality) {
  const index = TIER_ORDER.indexOf(resolveTier(quality).id);
  if (index <= 0) return null;
  return VIDEO_TIERS[TIER_ORDER[index - 1]];
}

/**
 * Opt-in: when a provider fails, retry once on the next cheaper tier instead
 * of surfacing the error. Off by default because it silently changes the
 * output quality the user paid for.
 */
function isFallbackEnabled() {
  return String(process.env.VIDEO_TIER_FALLBACK || '').toLowerCase() === 'true';
}

/** Tier catalogue for the API/UI, cheapest first. Provider/model stay internal. */
function listTiers() {
  return TIER_ORDER.map((id) => {
    const { provider, model, ...publicFields } = VIDEO_TIERS[id];
    return publicFields;
  });
}

/**
 * Admin view: tiers with their provider, estimated unit cost and the margin
 * at the tier's credit price. Lets an operator see which tiers are worth
 * enabling before turning on an expensive vendor.
 */
function describeEconomics() {
  const { unitCostFor, USD_PER_CREDIT } = require('../../config/economics.config');

  return TIER_ORDER.map((id) => {
    const tier = VIDEO_TIERS[id];
    const costUsd = unitCostFor('VIDEO', tier.provider);
    const revenueUsd = tier.credits * USD_PER_CREDIT;

    return {
      tier: tier.id,
      label: tier.label,
      provider: tier.provider,
      credits: tier.credits,
      costUsd: Number(costUsd.toFixed(4)),
      revenueUsd: Number(revenueUsd.toFixed(4)),
      marginUsd: Number((revenueUsd - costUsd).toFixed(4)),
      marginPercent: revenueUsd === 0 ? null : Math.round(((revenueUsd - costUsd) / revenueUsd) * 100),
    };
  });
}

module.exports = {
  VIDEO_TIERS,
  TIER_ORDER,
  DEFAULT_TIER,
  isValidTier,
  resolveTier,
  creditCostForQuality,
  lowerTier,
  isFallbackEnabled,
  listTiers,
  describeEconomics,
};
