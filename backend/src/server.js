require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`AI Studio backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection, shutting down:', err);
  server.close(() => process.exit(1));
});
