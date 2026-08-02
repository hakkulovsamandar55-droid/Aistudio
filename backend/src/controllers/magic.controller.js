const orchestrator = require('../services/orchestrator.service');
const { gateway } = require('../services/ai-gateway');
const { MODULES } = require('../config/modules.config');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const MAX_REQUEST_LENGTH = 500;

function assertValidRequest(userRequest) {
  if (!userRequest || !userRequest.trim()) {
    throw new AppError('Describe what you want to create', 400);
  }
  if (userRequest.length > MAX_REQUEST_LENGTH) {
    throw new AppError(`Request must be at most ${MAX_REQUEST_LENGTH} characters`, 400);
  }
}

/**
 * Analyses the request and returns the plan and its price without spending
 * anything, so the UI can show the user what will happen before they commit.
 */
const preview = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  assertValidRequest(prompt);

  const result = await orchestrator.preview(prompt.trim());
  res.json({ success: true, data: result });
});

/** Magic Mode: one sentence in, a whole project out. */
const run = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  assertValidRequest(prompt);

  const { project, tasks, totalCredits } = await orchestrator.createProject(req.user.id, prompt.trim());

  res.status(202).json({
    success: true,
    data: {
      projectId: project.id,
      title: project.title,
      status: project.status,
      goal: project.goal,
      tasks,
      totalCredits,
    },
  });
});

const listProjects = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);

  const { items, pagination } = await orchestrator.listProjects(req.user.id, { page, limit });
  res.json({ success: true, data: items, pagination });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await orchestrator.getProject(req.params.id, req.user.id);
  res.json({ success: true, data: project });
});

const deleteProject = asyncHandler(async (req, res) => {
  await orchestrator.deleteProject(req.params.id, req.user.id);
  res.json({ success: true, data: { id: req.params.id, deleted: true } });
});

/**
 * What the platform can currently do and which provider is serving each
 * module — the vision's "user never chooses the AI", made inspectable.
 */
const listModules = asyncHandler(async (req, res) => {
  const selection = gateway.describe();

  res.json({
    success: true,
    data: selection.map((entry) => ({
      ...entry,
      label: MODULES[entry.module].label,
      icon: MODULES[entry.module].icon,
      credits: MODULES[entry.module].credits,
      providerLabel: entry.label,
    })),
  });
});

module.exports = { preview, run, listProjects, getProject, deleteProject, listModules };
