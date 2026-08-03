require('dotenv').config();

const { Worker } = require('bullmq');
const { isQueueEnabled, getRedisConnection, closeRedis } = require('./config/redis');
const { QUEUE_NAME, closeQueue } = require('./queues/videoGeneration.queue');
const { runVideoGenerationJob } = require('./queues/videoGeneration.processor');
const providerSettings = require('./services/providerSettings.service');
const { reconcileOnStartup } = require('./services/reconciliation.service');
const prisma = require('./config/db');
const logger = require('./utils/logger');

/**
 * Background worker. Runs as its own process (`npm run worker`, or a second
 * PM2 app) so a slow render never occupies an API request handler and a
 * redeploy of the API does not abandon work in progress.
 */

// Video renders are minutes long and mostly spent waiting on a provider, so a
// handful in parallel is fine; the real ceiling is provider rate limits.
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 3);

if (!isQueueEnabled()) {
  logger.error(
    'Worker cannot start: REDIS_URL is not set (or QUEUE_DRIVER=inline). ' +
      'Without Redis the API runs jobs in-process and no worker is needed.'
  );
  process.exit(1);
}

providerSettings.init().catch((err) => {
  logger.warn(`Provider settings could not be preloaded: ${err.message}`);
});

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const attemptsAllowed = job.opts.attempts || 1;
    logger.info(
      `Processing video generation ${job.data.generationId} (attempt ${job.attemptsMade + 1}/${attemptsAllowed})`
    );
    // Intermediate attempts must not mark the row FAILED — BullMQ decides
    // whether there is a retry left, and the `failed` handler below closes
    // the job out once there is not.
    await runVideoGenerationJob(job.data, { finalAttempt: false });
  },
  { connection: getRedisConnection(), concurrency: CONCURRENCY }
);

worker.on('completed', (job) => {
  logger.info(`Video generation ${job.data.generationId} completed`);
});

worker.on('failed', async (job, err) => {
  if (!job) {
    logger.error(`A video job failed without job context: ${err.message}`);
    return;
  }

  const attemptsAllowed = job.opts.attempts || 1;
  const exhausted = job.attemptsMade >= attemptsAllowed;

  if (!exhausted) {
    logger.warn(
      `Video generation ${job.data.generationId} failed (attempt ${job.attemptsMade}/${attemptsAllowed}), retrying: ${err.message}`
    );
    return;
  }

  // Out of retries: this is the point where the user is told it did not work
  // and gets their credits back.
  const { failVideoGeneration } = require('./services/generation.service');
  try {
    await failVideoGeneration(job.data.generationId, err.message);
  } catch (failErr) {
    logger.error(
      `Could not finalise failed generation ${job.data.generationId}: ${failErr.message}`
    );
  }
});

worker.on('error', (err) => {
  logger.error(`Worker error: ${err.message}`);
});

logger.info(`Video worker started (concurrency ${CONCURRENCY}), watching queue "${QUEUE_NAME}"`);

// Any generation left PROCESSING by a previous crash is closed out here.
reconcileOnStartup();

async function shutdown(signal) {
  logger.info(`${signal} received, finishing in-flight jobs before exit...`);
  try {
    // close() waits for active jobs to finish rather than abandoning them.
    await worker.close();
    await closeQueue();
    await prisma.$disconnect();
    await closeRedis();
    logger.info('Worker shut down cleanly.');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during worker shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = worker;
