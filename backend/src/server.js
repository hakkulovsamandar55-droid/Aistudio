require('dotenv').config();

const app = require('./app');
const providerSettings = require('./services/providerSettings.service');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

// Provider credentials live in the database and are read synchronously by
// provider constructors, so the cache is primed before the first request.
// A failure here is non-fatal: the gateway falls back to .env.
providerSettings.init().catch((err) => {
  logger.warn(`Provider settings could not be preloaded: ${err.message}`);
});

const server = app.listen(PORT, () => {
  logger.info(`AI Studio backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection, shutting down:', err);
  server.close(() => process.exit(1));
});
