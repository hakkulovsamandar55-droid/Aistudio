const { prisma, registerUser, grantCredits } = require('./helpers');
const generationService = require('../src/services/generation.service');
const reconciliation = require('../src/services/reconciliation.service');
const { runVideoGenerationJob } = require('../src/queues/videoGeneration.processor');
const { videoGateway } = require('../src/services/ai-gateway');

/**
 * The queue's job is to make sure work survives a restart and that a user
 * never pays for something that didn't happen. These tests cover that
 * contract without needing Redis: the queue module falls back to running
 * jobs in-process when REDIS_URL is unset, and the failure/refund path is
 * the same code either way.
 */

async function createProcessingVideo(userId, { creditsUsed = 0 } = {}) {
  return prisma.generation.create({
    data: {
      userId,
      type: 'VIDEO',
      userPrompt: 'a drone shot over mountains',
      status: 'PROCESSING',
      provider: 'kling',
      creditsUsed,
    },
  });
}

describe('failVideoGeneration', () => {
  it('marks a generation failed and records the reason', async () => {
    const { user } = await registerUser();
    const generation = await createProcessingVideo(user.id);

    await generationService.failVideoGeneration(generation.id, 'provider timed out');

    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('FAILED');
    expect(row.errorMessage).toBe('provider timed out');
  });

  it('refunds credits that were already charged', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const generation = await createProcessingVideo(user.id, { creditsUsed: 20 });
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    await generationService.failVideoGeneration(generation.id, 'render crashed');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 20);

    const refund = await prisma.creditTransaction.findFirst({
      where: { userId: user.id, type: 'REFUND' },
    });
    expect(refund.amount).toBe(20);

    // creditsUsed is zeroed so a second pass can't refund the same credits.
    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.creditsUsed).toBe(0);
  });

  it('refunds nothing when the generation was never charged', async () => {
    const { user } = await registerUser();
    const generation = await createProcessingVideo(user.id, { creditsUsed: 0 });
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    await generationService.failVideoGeneration(generation.id, 'failed before charging');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits);
    expect(await prisma.creditTransaction.count({ where: { type: 'REFUND' } })).toBe(0);
  });

  it('is safe to call twice — a retry storm cannot double-refund', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const generation = await createProcessingVideo(user.id, { creditsUsed: 20 });
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    await generationService.failVideoGeneration(generation.id, 'first');
    await generationService.failVideoGeneration(generation.id, 'second');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 20);
    expect(await prisma.creditTransaction.count({ where: { userId: user.id, type: 'REFUND' } })).toBe(1);
  });

  it('leaves an already-completed generation alone', async () => {
    const { user } = await registerUser();
    const generation = await prisma.generation.create({
      data: {
        userId: user.id,
        type: 'VIDEO',
        userPrompt: 'finished already',
        status: 'COMPLETED',
        provider: 'kling',
        resultUrl: 'https://cdn.test/video.mp4',
        creditsUsed: 20,
      },
    });

    const result = await generationService.failVideoGeneration(generation.id, 'late failure event');

    expect(result).toBeNull();
    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('COMPLETED');
    expect(row.resultUrl).toBe('https://cdn.test/video.mp4');
  });
});

describe('video job processor', () => {
  afterEach(() => jest.restoreAllMocks());

  it('marks the generation failed on a final attempt', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const generation = await createProcessingVideo(user.id, { creditsUsed: 8 });
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    jest.spyOn(videoGateway, 'generateVideo').mockRejectedValue(new Error('provider exploded'));

    await expect(
      runVideoGenerationJob(
        {
          generationId: generation.id,
          userId: user.id,
          userPrompt: 'a drone shot',
          requiredCredits: 8,
          options: { quality: 'low' },
        },
        { finalAttempt: true }
      )
    ).rejects.toThrow('provider exploded');

    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('FAILED');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 8);
  });

  it('leaves the generation PROCESSING when a retry is still coming', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const generation = await createProcessingVideo(user.id);

    jest.spyOn(videoGateway, 'generateVideo').mockRejectedValue(new Error('transient blip'));

    await expect(
      runVideoGenerationJob(
        {
          generationId: generation.id,
          userId: user.id,
          userPrompt: 'a drone shot',
          requiredCredits: 8,
          options: { quality: 'low' },
        },
        { finalAttempt: false }
      )
    ).rejects.toThrow('transient blip');

    // Flipping to FAILED here would show the user a failure that is about to
    // silently come back to life on the next attempt.
    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('PROCESSING');
  });

  it('completes and charges exactly once on success', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const generation = await createProcessingVideo(user.id);
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    await runVideoGenerationJob({
      generationId: generation.id,
      userId: user.id,
      userPrompt: 'a drone shot',
      requiredCredits: 20,
      options: { quality: 'standard' },
    });

    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('COMPLETED');
    expect(row.resultUrl).toBeTruthy();

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits - 20);
  });
});

describe('startup reconciliation', () => {
  /** Backdates a row so it looks abandoned rather than actively rendering. */
  async function backdate(generationId, interval = '1 hour') {
    await prisma.$executeRawUnsafe(
      `UPDATE generations SET updated_at = NOW() - INTERVAL '${interval}' WHERE id = $1`,
      generationId
    );
  }

  it('fails and refunds a generation abandoned by a crash', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const generation = await createProcessingVideo(user.id, { creditsUsed: 20 });
    await backdate(generation.id);
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    const result = await reconciliation.reconcileStuckGenerations();

    expect(result.checked).toBe(1);
    expect(result.failed).toBe(1);

    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('FAILED');
    expect(row.errorMessage).toMatch(/restart/i);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 20);
  });

  it('leaves a generation that is still actively rendering alone', async () => {
    const { user } = await registerUser();
    const generation = await createProcessingVideo(user.id);
    // Not backdated: this one started moments ago and may well be mid-render
    // on another instance. Killing it during a rolling deploy would be wrong.

    const result = await reconciliation.reconcileStuckGenerations();

    expect(result.checked).toBe(0);
    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('PROCESSING');
  });

  it('ignores generations that already finished', async () => {
    const { user } = await registerUser();
    const generation = await prisma.generation.create({
      data: {
        userId: user.id,
        type: 'VIDEO',
        userPrompt: 'done',
        status: 'COMPLETED',
        provider: 'kling',
        creditsUsed: 20,
      },
    });
    await backdate(generation.id);

    const result = await reconciliation.reconcileStuckGenerations();

    expect(result.checked).toBe(0);
    expect(await prisma.creditTransaction.count({ where: { type: 'REFUND' } })).toBe(0);
  });

  it('counts stuck generations without changing anything', async () => {
    const { user } = await registerUser();
    const generation = await createProcessingVideo(user.id, { creditsUsed: 20 });
    await backdate(generation.id);

    expect(await reconciliation.countStuckGenerations()).toBe(1);

    const row = await prisma.generation.findUnique({ where: { id: generation.id } });
    expect(row.status).toBe('PROCESSING');
  });
});

describe('project runs (the chat path)', () => {
  const orchestrator = require('../src/services/orchestrator.service');

  async function createRunningProject(userId) {
    return prisma.project.create({
      data: {
        userId,
        title: 'Test campaign',
        userRequest: 'reklama uchun video',
        goal: 'advert',
        intent: {},
        plan: [],
        status: 'RUNNING',
      },
    });
  }

  it('closes out a crashed run and refunds only what was in flight', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const project = await createRunningProject(user.id);

    // One asset finished and was paid for; one was still rendering.
    const done = await prisma.generation.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: 'SCRIPT',
        userPrompt: 'x',
        status: 'COMPLETED',
        provider: 'mock',
        resultText: 'a finished script',
        creditsUsed: 1,
      },
    });
    const inFlight = await prisma.generation.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: 'VIDEO',
        userPrompt: 'x',
        status: 'PROCESSING',
        provider: 'kling',
        creditsUsed: 20,
      },
    });

    const before = await prisma.user.findUnique({ where: { id: user.id } });
    await orchestrator.failProject(project.id, 'worker died');
    const after = await prisma.user.findUnique({ where: { id: user.id } });

    // Only the in-flight asset is refunded — the finished one was delivered.
    expect(after.credits).toBe(before.credits + 20);

    expect((await prisma.generation.findUnique({ where: { id: done.id } })).status).toBe('COMPLETED');
    expect((await prisma.generation.findUnique({ where: { id: inFlight.id } })).status).toBe('FAILED');

    // Something was delivered, so the project is PARTIAL rather than FAILED.
    expect((await prisma.project.findUnique({ where: { id: project.id } })).status).toBe('PARTIAL');
  });

  it('marks a run that produced nothing as FAILED', async () => {
    const { user } = await registerUser();
    const project = await createRunningProject(user.id);
    await prisma.generation.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: 'VIDEO',
        userPrompt: 'x',
        status: 'PROCESSING',
        provider: 'kling',
      },
    });

    await orchestrator.failProject(project.id, 'nothing worked');

    expect((await prisma.project.findUnique({ where: { id: project.id } })).status).toBe('FAILED');
  });

  it('leaves an already-finished project alone', async () => {
    const { user } = await registerUser();
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: 'Done',
        userRequest: 'x',
        goal: 'advert',
        intent: {},
        plan: [],
        status: 'COMPLETED',
      },
    });

    expect(await orchestrator.failProject(project.id, 'late event')).toBeNull();
    expect((await prisma.project.findUnique({ where: { id: project.id } })).status).toBe('COMPLETED');
  });

  it('reconciliation closes out a project abandoned by a crash', async () => {
    const { user } = await registerUser();
    await grantCredits(user.id, 100);
    const project = await createRunningProject(user.id);
    await prisma.generation.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: 'VIDEO',
        userPrompt: 'x',
        status: 'PROCESSING',
        provider: 'kling',
        creditsUsed: 20,
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE projects SET updated_at = NOW() - INTERVAL '1 hour' WHERE id = $1`,
      project.id
    );
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    const result = await reconciliation.reconcileStuckProjects();

    expect(result.failed).toBe(1);
    expect((await prisma.project.findUnique({ where: { id: project.id } })).status).toBe('FAILED');
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits + 20);
  });

  it('leaves a project that only just started alone', async () => {
    const { user } = await registerUser();
    const project = await createRunningProject(user.id);

    const result = await reconciliation.reconcileStuckProjects();

    expect(result.checked).toBe(0);
    expect((await prisma.project.findUnique({ where: { id: project.id } })).status).toBe('RUNNING');
  });
});
