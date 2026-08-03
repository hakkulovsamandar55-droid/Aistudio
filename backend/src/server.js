require('dotenv').config();

// Before anything else, so an error thrown during startup is still reported.
require('./config/sentry').init({ context: 'api' });

const app = require('./app');
const providerSettings = require('./services/providerSettings.service');
const { reconcileOnStartup } = require('./services/reconciliation.service');
const { isQueueEnabled } = require('./config/redis');
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

  if (isQueueEnabled()) {
    logger.info('Background jobs: Redis queue (run `npm run worker` to process them)');
  } else {
    logger.warn('Background jobs: in-process fallback — set REDIS_URL to survive restarts');
  }
});

// Close out anything a previous crash left stranded in PROCESSING. Runs in
// both queue and inline mode: without Redis there is no worker to do it.
reconcileOnStartup();

/**
 * Graceful shutdown.
 *
 * PM2 (and every container runtime) sends SIGTERM on redeploy and only then
 * SIGKILLs. Exiting immediately cuts off requests that were mid-flight — the
 * user sees a failed generation or a dropped payment callback for no reason
 * other than that we happened to be deploying. So: stop accepting new
 * connections, let in-flight work finish, then release the resources.
 *
 * The timeout is the backstop. A connection that refuses to drain must not
 * hold the process open until the runtime SIGKILLs it, because that skips
 * the cleanup below entirely.
 */
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 15000);

let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received — draining in-flight requests before exit`);

  const forceExit = setTimeout(() => {
    logger.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, exiting anyway`);
    process.exit(exitCode || 1);
  }, SHUTDOWN_TIMEOUT_MS);
  // Don't let the timer itself be the reason the process stays alive.
  forceExit.unref();

  try {
    await new Promise((resolve) => server.close(resolve));

    const prisma = require('./config/db');
    const { closeQueue } = require('./queues/videoGeneration.queue');
    const { closeRedis } = require('./config/redis');
    const sentry = require('./config/sentry');

    // Sentry first: anything queued should get out before the process goes.
    await sentry.flush();
    await closeQueue();
    await prisma.$disconnect();
    await closeRedis();

    clearTimeout(forceExit);
    logger.info('Shut down cleanly');
    process.exit(exitCode);
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection, shutting down', err);
  require('./config/sentry').captureException(err);
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  // The process is in an undefined state now; report it and go down rather
  // than serving requests from a corrupted one.
  logger.error('Uncaught exception, shutting down', err);
  require('./config/sentry').captureException(err);
  shutdown('uncaughtException', 1);
});
