const { MODULES } = require('./modules.config');

// Cost (in credits) per generation type. Derived from the module registry so
// pricing lives in exactly one place — adding a module automatically prices it.
const CREDIT_COSTS = Object.fromEntries(
  Object.values(MODULES).map((module) => [module.id, module.credits])
);

// Packages users can purchase via Stripe. `stripePriceId` should match a real
// Price object in the Stripe dashboard before checkout will work.
const CREDIT_PACKAGES = [
  {
    name: 'Starter',
    credits: 100,
    priceUsd: 4.99,
    stripePriceId: 'price_starter_placeholder',
  },
  {
    name: 'Pro',
    credits: 500,
    priceUsd: 19.99,
    stripePriceId: 'price_pro_placeholder',
  },
  {
    name: 'Business',
    credits: 2000,
    priceUsd: 59.99,
    stripePriceId: 'price_business_placeholder',
  },
];

// Free credits handed out by the growth features.
const BONUSES = {
  SIGNUP: 10,
  // Paid to the existing user whose code was used...
  REFERRER: 20,
  // ...and to the new user on top of their signup bonus.
  REFERRED: 10,
  DAILY: 3,
};

const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

module.exports = { CREDIT_COSTS, CREDIT_PACKAGES, BONUSES, DAILY_BONUS_COOLDOWN_MS };
