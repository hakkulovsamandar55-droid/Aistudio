const prisma = require('../config/db');
const { getModule, creditCostFor } = require('../config/modules.config');
const { applyStyle } = require('../config/styles.config');
const { gateway, videoGateway } = require('./ai-gateway');
const creditService = require('./credit.service');
const promptEnhancer = require('./promptEnhancer.service');
const intentAnalyzer = require('./intentAnalyzer.service');
const taskPlanner = require('./taskPlanner.service');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Runs a planned project end to end: for each task it builds the right prompt,
 * calls the gateway through the module abstraction, stores the asset, and
 * charges only for what actually succeeded.
 *
 * Everything happens in the background — Magic Mode returns a project id
 * immediately and the client polls, because a campaign can take minutes.
 */

const TEXT_MODULES = new Set(['SCRIPT']);

/** Wording for each text task, so the same SCRIPT module serves many roles. */
const TEXT_INSTRUCTIONS = {
  strategy: (subject) =>
    `Quyidagi g'oya uchun qisqa marketing strategiyasi yoz: "${subject}". Maqsad, auditoriya, kanallar va post rejasini ko'rsat.`,
  script: (subject) =>
    `Quyidagi g'oya uchun 15 soniyalik video ssenariy yoz: "${subject}". Sahnalarga bo'l, har sahnada kadr tavsifi bo'lsin.`,
  caption: (subject) =>
    `Quyidagi g'oya uchun ijtimoiy tarmoq uchun qisqa, jozibali post matni yoz: "${subject}".`,
  hashtags: (subject) => `Quyidagi g'oya uchun 10-12 ta mos hashtag yoz: "${subject}".`,
};

function buildTextPrompt(role, subject) {
  const build = TEXT_INSTRUCTIONS[role] || TEXT_INSTRUCTIONS.script;
  return build(subject);
}

/**
 * Estimates a project without touching the database, so the UI can show the
 * plan and its price before the user commits any credits.
 */
async function preview(userRequest) {
  const intent = await intentAnalyzer.analyze(userRequest);
  const tasks = taskPlanner.plan(intent);

  return {
    intent,
    tasks: tasks.map((item) => ({
      step: item.step,
      role: item.role,
      module: item.module,
      label: item.label,
      credits: creditCostFor(item.module),
      emoji: getModule(item.module).emoji,
    })),
    totalCredits: taskPlanner.planCost(tasks),
    estimatedSeconds: taskPlanner.planDuration(tasks),
  };
}

async function createProject(userId, userRequest) {
  const intent = await intentAnalyzer.analyze(userRequest);
  const tasks = taskPlanner.plan(intent);
  const totalCredits = taskPlanner.planCost(tasks);

  // Checked up front so a user isn't left with a half-built campaign, even
  // though each asset is charged individually as it succeeds.
  await creditService.checkSufficientCredits(userId, totalCredits);

  const project = await prisma.project.create({
    data: {
      userId,
      title: intent.title,
      userRequest,
      goal: intent.goal,
      intent,
      plan: tasks,
      status: 'RUNNING',
    },
  });

  // Fire and forget: the same pattern as video generation, and structured so
  // it can move onto a real job queue without changing callers.
  runProject(project.id, userId, intent, tasks).catch((err) => {
    logger.error(`Unhandled error running project ${project.id}`, err);
  });

  return { project, tasks, totalCredits };
}

async function runProject(projectId, userId, intent, tasks) {
  // Text output from earlier steps feeds later ones, which is what makes a
  // campaign coherent instead of a bag of unrelated assets.
  const context = { subject: intent.subject, script: null };
  let succeeded = 0;
  let failed = 0;
  let creditsSpent = 0;

  for (const item of tasks) {
    // eslint-disable-next-line no-await-in-loop
    const outcome = await runTask({ projectId, userId, intent, item, context });
    if (outcome.ok) {
      succeeded += 1;
      creditsSpent += outcome.credits;
    } else {
      failed += 1;
    }
  }

  const status = failed === 0 ? 'COMPLETED' : succeeded === 0 ? 'FAILED' : 'PARTIAL';

  await prisma.project.update({
    where: { id: projectId },
    data: { status, creditsUsed: creditsSpent },
  });

  logger.info(`Project ${projectId} finished: ${status} (${succeeded} ok, ${failed} failed)`);
}

async function runTask({ projectId, userId, intent, item, context }) {
  const cost = creditCostFor(item.module);
  const isText = TEXT_MODULES.has(item.module);

  const generation = await prisma.generation.create({
    data: {
      userId,
      projectId,
      role: item.role,
      type: item.module,
      userPrompt: context.subject,
      style: isText ? null : intent.style,
      status: 'PROCESSING',
      provider: 'pending',
    },
  });

  try {
    let prompt;
    let options = { ...item.options };

    if (isText) {
      prompt = buildTextPrompt(item.role, context.subject);
      options.kind = item.options.kind || item.role;
      // The raw idea travels alongside the instruction so template-based
      // providers can work from it directly (see MockTextProvider).
      options.subject = context.subject;
    } else {
      // Visual and audio tasks get the enhanced, style-loaded prompt. When a
      // script already exists, it grounds the visual so the campaign's parts
      // describe the same thing.
      const base = item.options.useScript && context.script
        ? `${context.subject}. Ssenariy asosida: ${context.script.slice(0, 300)}`
        : context.subject;

      if (item.module === 'IMAGE' || item.module === 'VIDEO') {
        const enhance = item.module === 'VIDEO'
          ? promptEnhancer.enhanceVideoPrompt
          : promptEnhancer.enhanceImagePrompt;
        const { enhancedPrompt } = await enhance(base);
        prompt = applyStyle(enhancedPrompt, item.module, intent.style);
      } else {
        prompt = base;
      }
      options.aspectRatio = intent.aspectRatio;
    }

    // Video goes through the tier-aware helper so a campaign uses the same
    // provider routing (and therefore the same pricing) as a direct video
    // request. Without a quality on the plan this resolves to the default
    // tier, whose price matches creditCostFor('VIDEO').
    const result =
      item.module === 'VIDEO'
        ? await videoGateway.generateVideo(prompt, options)
        : await gateway.run(item.module, prompt, options);

    if (isText && result.text) {
      context[item.role] = result.text;
      if (item.role === 'script') context.script = result.text;
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: 'COMPLETED',
        enhancedPrompt: prompt,
        resultUrl: result.url || null,
        resultText: result.text || null,
        provider: result.provider,
        creditsUsed: cost,
      },
    });

    // Charged per asset, only after it succeeded — a failed step costs nothing.
    await creditService.deductCredits(
      userId,
      cost,
      creditTypeFor(item.module),
      `${getModule(item.module).label}: ${item.label}`
    );

    return { ok: true, credits: cost };
  } catch (err) {
    logger.error(`Project ${projectId} task ${item.role} failed: ${err.message}`);
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: 'FAILED', errorMessage: err.message, provider: 'none' },
    });
    return { ok: false, credits: 0 };
  }
}

/**
 * Credit transactions predate the extra modules, so anything that isn't an
 * image or a video is booked under the image type rather than widening the
 * enum for every new module.
 */
function creditTypeFor(moduleId) {
  if (moduleId === 'VIDEO') return 'GENERATION_VIDEO';
  return 'GENERATION_IMAGE';
}

async function getProject(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    include: {
      generations: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }
  return project;
}

async function listProjects(userId, { page = 1, limit = 12 } = {}) {
  const where = { userId, deletedAt: null };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        generations: {
          where: { deletedAt: null },
          select: { id: true, type: true, role: true, status: true, resultUrl: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function deleteProject(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
  });
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.project.update({ where: { id: projectId }, data: { deletedAt: now } }),
    prisma.generation.updateMany({
      where: { projectId },
      data: { deletedAt: now, isPublic: false },
    }),
  ]);

  return true;
}

module.exports = { preview, createProject, getProject, listProjects, deleteProject, runProject };
