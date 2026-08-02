const rateLimit = require('express-rate-limit');

// The automated suite fires many requests from a single address in seconds,
// which is exactly what these limiters exist to stop — so they stand down
// under NODE_ENV=test and nowhere else.
const skipInTests = () => process.env.NODE_ENV === 'test';

// Auth endpoints are a common target for credential stuffing / brute force,
// so they get a tighter window than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, error: 'Too many auth requests, please try again later.' },
});

// Generation endpoints call paid external APIs, so they're limited to stop
// a single account from hammering the AI providers or running up cost.
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, error: 'Too many generation requests, please slow down.' },
});

module.exports = { authLimiter, generateLimiter };
