const prisma = require('../config/db');
const { isQueueEnabled, getRedisConnection } = require('../config/redis');
const { hasLiveJob } = require('../queues/videoGeneration.queue');
const logger = require('../utils/logger');

/**
 * Startup repair for generations that were mid-flight when the process died.
 *
 * A row stuck in PROCESSING is worse than a failure: the client polls it
 * forever and the user has no idea their request is never coming back. On
 * boot we look for those rows and, for any the queue no longer knows about,
 * close them out as FAILED and refund whatever they were charged.
 *
 * The age threshold guards against a second instance starting up while the
 * first is happily rendering: only generations older than any plausible
 * render time are considered abandoned. With Redis in play we additionally
 * skip anything the queue still holds a live job for, so a long render is
 * never killed by a rolling deploy.
 */
const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;

async function reconcileStuckGenerations({ staleAfterMs = DEFAULT_STALE_AFTER_MS } = {}) {
  const { failVideoGeneration } = require('./generation.service');
  const cutoff = new Date(Date.now() - staleAfterMs);

  const stuck = await prisma.generation.findMany({
    where: { status: 'PROCESSING', updatedAt: { lt: cutoff }, deletedAt: null },
    select: { id: true, type: true, userId: true, creditsUsed: true },
  });

  if (stuck.length === 0) return { checked: 0, failed: 0, skipped: 0 };

  let failed = 0;
  let skipped = 0;

  for (const generation of stuck) {
    // eslint-disable-next-line no-await-in-loop
    const live = await hasLiveJob(generation.id).catch(() => false);
    if (live) {
      skipped += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await failVideoGeneration(
      generation.id,
      'Server restarted while this generation was running. Your credits were not charged.'
    );
    failed += 1;
  }

  logger.warn(
    `Startup reconciliation: ${stuck.length} stuck generation(s) — ${failed} failed and refunded, ${skipped} still running`
  );

  return { checked: stuck.length, failed, skipped };
}

/**
 * The same repair for Magic Mode runs. A project left on RUNNING is the
 * chat's version of the stuck-generation problem: the client polls it
 * forever. Closing the project out also fails and refunds any generation it
 * left in flight.
 */
async function reconcileStuckProjects({ staleAfterMs = DEFAULT_STALE_AFTER_MS } = {}) {
  const { failProject } = require('./orchestrator.service');
  const { hasLiveJob: hasLiveProjectJob } = require('../queues/projectRun.queue');
  const cutoff = new Date(Date.now() - staleAfterMs);

  const stuck = await prisma.project.findMany({
    where: { status: { in: ['RUNNING', 'PLANNING'] }, updatedAt: { lt: cutoff }, deletedAt: null },
    select: { id: true },
  });

  if (stuck.length === 0) return { checked: 0, failed: 0, skipped: 0 };

  let failed = 0;
  let skipped = 0;

  for (const project of stuck) {
    // eslint-disable-next-line no-await-in-loop
    const live = await hasLiveProjectJob(project.id).catch(() => false);
    if (live) {
      skipped += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await failProject(
      project.id,
      'Server restarted while this project was running. Unfinished parts were not charged.'
    );
    failed += 1;
  }

  logger.warn(
    `Startup reconciliation: ${stuck.length} stuck project(s) — ${failed} closed out, ${skipped} still running`
  );

  return { checked: stuck.length, failed, skipped };
}

/**
 * Re-queues nothing and repairs nothing on its own — this just reports what a
 * reconciliation pass would act on, so the admin panel can show a number
 * without mutating anything.
 */
async function countStuckGenerations({ staleAfterMs = DEFAULT_STALE_AFTER_MS } = {}) {
  const cutoff = new Date(Date.now() - staleAfterMs);

  const [generations, projects] = await Promise.all([
    prisma.generation.count({
      where: { status: 'PROCESSING', updatedAt: { lt: cutoff }, deletedAt: null },
    }),
    prisma.project.count({
      where: { status: { in: ['RUNNING', 'PLANNING'] }, updatedAt: { lt: cutoff }, deletedAt: null },
    }),
  ]);

  return generations + projects;
}

/** Fire-and-forget wrapper for server startup: never blocks or kills boot. */
function reconcileOnStartup(options) {
  return Promise.all([
    reconcileStuckGenerations(options),
    reconcileStuckProjects(options),
  ]).catch((err) => {
    logger.error(`Startup reconciliation failed: ${err.message}`);
    return null;
  });
}

module.exports = {
  DEFAULT_STALE_AFTER_MS,
  reconcileStuckGenerations,
  reconcileStuckProjects,
  countStuckGenerations,
  reconcileOnStartup,
  // Re-exported so callers do not need to know where the flag lives.
  isQueueEnabled,
  getRedisConnection,
};
