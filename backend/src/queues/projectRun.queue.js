const { Queue } = require('bullmq');
const { isQueueEnabled, getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

const QUEUE_NAME = 'projectRun';

/**
 * A Magic Mode run — the chat's "say an idea, get the assets" path, which is
 * how most people actually use the product — can take minutes and produce
 * several paid assets. Without a queue a restart mid-run strands every
 * generation in PROCESSING and leaves the project RUNNING forever.
 *
 * Unlike a single video, this job does **not** retry. A run charges per asset
 * as each one succeeds, so replaying it from the top would re-generate and
 * re-charge for work that already completed. One attempt; a failure is closed
 * out and refunded rather than repeated.
 */
const JOB_OPTIONS = {
  attempts: 1,
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

let queue = null;

function getQueue() {
  if (!isQueueEnabled()) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  }
  return queue;
}

async function enqueueProjectRun(payload) {
  const q = getQueue();

  if (!q) {
    const { runProjectJob } = require('./projectRun.processor');
    runProjectJob(payload).catch((err) => {
      logger.error(`Inline project run ${payload.projectId} failed: ${err.message}`);
    });
    return null;
  }

  const job = await q.add('run', payload, { ...JOB_OPTIONS, jobId: payload.projectId });
  logger.info(`Queued project run ${payload.projectId} as job ${job.id}`);
  return job.id;
}

async function hasLiveJob(projectId) {
  const q = getQueue();
  if (!q) return false;

  const job = await q.getJob(projectId);
  if (!job) return false;

  const state = await job.getState();
  return ['waiting', 'waiting-children', 'active', 'delayed', 'prioritized'].includes(state);
}

async function getQueueStats() {
  const q = getQueue();
  if (!q) return { enabled: false, counts: null };

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
  enqueueProjectRun,
  hasLiveJob,
  getQueueStats,
  closeQueue,
};
