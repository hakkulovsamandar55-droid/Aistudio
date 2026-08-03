/**
 * Runs one Magic Mode project. Separate from the queue module so the worker,
 * the inline fallback and the tests all drive the same path.
 */
async function runProjectJob({ projectId, userId, intent, tasks }) {
  // Lazily required: the orchestrator requires this queue to enqueue work.
  const orchestrator = require('../services/orchestrator.service');

  try {
    await orchestrator.runProject(projectId, userId, intent, tasks);
  } catch (err) {
    // There is no retry for a project run — replaying it would re-charge for
    // assets that already succeeded — so a failure is final and gets closed
    // out here.
    await orchestrator.failProject(projectId, err.message);
    throw err;
  }
}

module.exports = { runProjectJob };
