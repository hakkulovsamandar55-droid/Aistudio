const logger = require('../utils/logger');

/**
 * Single place where every error in the app is turned into a JSON response.
 * Operational errors (AppError and subclasses) expose their own message/status;
 * anything else is logged in full but only a generic message reaches the client
 * so internal details never leak to production users.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.isOperational && err.statusCode ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`, isProd ? undefined : err.stack);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${err.message}`);
  }

  const message = statusCode >= 500 && isProd ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
