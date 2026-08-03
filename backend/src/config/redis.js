const IORedis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Redis is what makes background work survive a restart, so it is the one
 * dependency the queue genuinely needs. It is still optional: with no
 * REDIS_URL (local dev, CI, the test suite) the queue falls back to running
 * jobs in-process, which is exactly what the app did before the queue
 * existed. Production sets REDIS_URL and gets durability.
 */

// BullMQ needs blocking commands to wait indefinitely rather than give up
// after ioredis's default 20 retries, and it does its own ready checks.
const BULLMQ_CONNECTION_OPTS = { maxRetriesPerRequest: null, enableReadyCheck: false };

function redisUrl() {
  return process.env.REDIS_URL || '';
}

/**
 * True when background jobs should go through Redis. `QUEUE_DRIVER=inline`
 * forces the in-process fallback even if Redis is reachable — useful for
 * reproducing the old behaviour without tearing down infrastructure.
 */
function isQueueEnabled() {
  return Boolean(redisUrl()) && process.env.QUEUE_DRIVER !== 'inline';
}

let connection = null;

/** Lazily-built shared connection. Callers must check isQueueEnabled() first. */
function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(redisUrl(), BULLMQ_CONNECTION_OPTS);
    connection.on('error', (err) => {
      // ioredis reconnects on its own; logging every attempt would drown the
      // log, so this stays at warn and carries the reason only.
      logger.warn(`Redis connection error: ${err.message}`);
    });
  }
  return connection;
}

/** Reports whether Redis answers PING — used by the health endpoint. */
async function pingRedis() {
  if (!isQueueEnabled()) return { configured: false, ok: true };
  try {
    const pong = await getRedisConnection().ping();
    return { configured: true, ok: pong === 'PONG' };
  } catch (err) {
    return { configured: true, ok: false, error: err.message };
  }
}

async function closeRedis() {
  if (!connection) return;
  const closing = connection;
  connection = null;
  await closing.quit().catch(() => closing.disconnect());
}

module.exports = {
  BULLMQ_CONNECTION_OPTS,
  isQueueEnabled,
  getRedisConnection,
  pingRedis,
  closeRedis,
};
