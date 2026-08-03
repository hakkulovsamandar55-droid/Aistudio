const prisma = require('../config/db');
const { pingRedis } = require('../config/redis');
const storage = require('../services/storage');

/**
 * Deep health check for deploy pipelines and uptime monitoring.
 *
 * "The process is listening" is not the same as "the app works" — a server
 * that can't reach Postgres will happily answer 200 to a naive ping while
 * failing every real request. So this actually touches each dependency and
 * returns 503 when one that matters is down, which is the signal a load
 * balancer or a deploy gate needs.
 *
 * Optional dependencies (Redis when the queue is off, S3 when storage is
 * local) report `configured: false` and never fail the check.
 */

const CHECK_TIMEOUT_MS = 3000;

/**
 * A hung dependency must not hang the health check itself — that turns a
 * degraded database into an unanswered probe, which reads as a total outage.
 *
 * The timer is always cleared: left dangling it would keep the event loop
 * alive for the full timeout after every single probe.
 */
function withTimeout(promise, label) {
  let timer;

  const timeout = new Promise((resolve) => {
    timer = setTimeout(
      () => resolve({ ok: false, error: `${label} check timed out` }),
      CHECK_TIMEOUT_MS
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const health = async (req, res) => {
  const [database, redis, fileStorage] = await Promise.all([
    withTimeout(checkDatabase(), 'database'),
    withTimeout(pingRedis(), 'redis'),
    withTimeout(storage.healthCheck(), 'storage'),
  ]);

  // The database is the only hard dependency: without it nothing works.
  // Redis and S3 only fail the check when they are configured but broken —
  // an unconfigured optional dependency is a deployment choice, not an
  // outage.
  const checks = { database, redis, storage: fileStorage };
  const healthy =
    database.ok && redis.ok !== false && fileStorage.ok !== false;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'ok' : 'degraded',
    checks,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Cheap liveness probe: answers as long as the event loop is turning. Kept
 * separate from the deep check so a monitor polling every few seconds isn't
 * hammering the database.
 */
const liveness = (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
};

module.exports = { health, liveness };
