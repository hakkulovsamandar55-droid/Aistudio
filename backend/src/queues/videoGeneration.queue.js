const { Queue } = require('bullmq');
const { isQueueEnabled, getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

const QUEUE_NAME = 'videoGeneration';

/**
 * Three attempts total — the first run plus two retries — spaced by an
 * exponential backoff. Video providers fail transiently often enough
 * (rate limits, cold GPUs, gateway timeouts) that a retry usually costs
 * nothing but a minute, while a permanent failure still resolves within
 * about five minutes rather than hanging forever.
 */
const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

let queue = null;

/** The BullMQ queue, or null when running without Redis. */
function getQueue() {
  if (!isQueueEnabled()) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  }
  return queue;
}

/**
 * Hands a video generation to the worker. The job id is the generation id,
 * which both de-duplicates re-submissions and lets reconciliation ask the
 * queue "is this generation still live?" by primary key.
 *
 * Without Redis the job runs in-process instead, preserving the original
 * fire-and-forget behaviour so dev and tests need no extra services.
 */
async function enqueueVideoGeneration(payload) {
  const q = getQueue();

  if (!q) {
    const { runVideoGenerationJob } = require('./videoGeneration.processor');
    runVideoGenerationJob(payload, { finalAttempt: true }).catch((err) => {
      logger.error(`Inline video generation ${payload.generationId} failed: ${err.message}`);
    });
    return null;
  }

  const job = await q.add('generate', payload, { ...JOB_OPTIONS, jobId: payload.generationId });
  logger.info(`Queued video generation ${payload.generationId} as job ${job.id}`);
  return job.id;
}

/** True when the queue still holds a live (waiting/active/delayed) job. */
async function hasLiveJob(generationId) {
  const q = getQueue();
  if (!q) return false;

  const job = await q.getJob(generationId);
  if (!job) return false;

  const state = await job.getState();
  return ['waiting', 'waiting-children', 'active', 'delayed', 'prioritized'].includes(state);
}

/** Job counts by state, for the admin panel's queue view. */
async function getQueueStats() {
  const q = getQueue();
  if (!q) {
    return { enabled: false, counts: null };
  }

  try {
    const counts = await q.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused');
    return { enabled: true, counts };
  } catch (err) {
    return { enabled: true, counts: null, error: err.message };
  }
}

async function closeQueue() {
  if (!queue) return;
  const closing = queue;
  queue = null;
  await closing.close();
}

module.exports = {
  QUEUE_NAME,
  JOB_OPTIONS,
  getQueue,
  enqueueVideoGeneration,
  hasLiveJob,
  getQueueStats,
  closeQueue,
};
