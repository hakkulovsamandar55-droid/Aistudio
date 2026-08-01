// Cost (in credits) of a single generation, per type. Keep these here instead
// of hardcoding them at call sites so pricing can change without touching logic.
const CREDIT_COSTS = {
  IMAGE: 2,
  VIDEO: 20,
};

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

module.exports = { CREDIT_COSTS, CREDIT_PACKAGES };
