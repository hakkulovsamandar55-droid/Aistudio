const rateLimit = require('express-rate-limit');

// Auth endpoints are a common target for credential stuffing / brute force,
// so they get a tighter window than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth requests, please try again later.' },
});

// Generation endpoints call paid external APIs, so they're limited to stop
// a single account from hammering the AI providers or running up cost.
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many generation requests, please slow down.' },
});

module.exports = { authLimiter, generateLimiter };
