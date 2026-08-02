const { estimateCredits, getModule } = require('../config/modules.config');
const { GOAL_ADVERT, GOAL_SOCIAL } = require('./intentAnalyzer.service');

/**
 * Turns an intent into an ordered list of concrete tasks.
 *
 * Ordering matters: text tasks run first so their output can seed the visual
 * ones (the script becomes the basis for the video prompt), which is what
 * makes a campaign feel authored rather than assembled from unrelated parts.
 */

const ROLE_ORDER = ['strategy', 'script', 'main', 'cover', 'voiceover', 'soundtrack', 'caption', 'hashtags'];

function task(role, module, label, options = {}) {
  return { role, module, label, options };
}

/**
 * A single-asset request: just the primary module, optionally with the
 * extras the user explicitly asked for.
 */
function planSingle(intent) {
  const tasks = [task('main', intent.primaryModule, `${getModule(intent.primaryModule).label} yaratish`)];

  intent.modules
    .filter((moduleId) => moduleId !== intent.primaryModule)
    .forEach((moduleId) => {
      const module = getModule(moduleId);
      if (!module) return;
      const role = moduleId === 'SCRIPT' ? 'script' : moduleId === 'MUSIC' ? 'soundtrack' : moduleId === 'VOICE' ? 'voiceover' : 'cover';
      tasks.push(task(role, moduleId, `${module.label} qo'shish`));
    });

  return tasks;
}

/**
 * A full campaign — the "AI Agent" behaviour. The platform acts like an
 * employee and produces every asset a person would need to actually publish.
 */
function planAdvert(intent) {
  const tasks = [
    task('strategy', 'SCRIPT', 'Marketing strategiyasi', { kind: 'strategy' }),
    task('script', 'SCRIPT', 'Ssenariy yozish', { kind: 'script' }),
    task('cover', 'IMAGE', 'Asosiy vizual', { useScript: false }),
  ];

  if (intent.modules.includes('VIDEO') || intent.primaryModule === 'VIDEO') {
    tasks.push(task('main', 'VIDEO', 'Reklama roligi', { useScript: true }));
  }
  if (intent.modules.includes('VOICE')) {
    tasks.push(task('voiceover', 'VOICE', 'Diktor ovozi', { useScript: true }));
  }
  if (intent.modules.includes('MUSIC')) {
    tasks.push(task('soundtrack', 'MUSIC', 'Fon musiqasi'));
  }

  tasks.push(task('caption', 'SCRIPT', 'Post matni', { kind: 'caption' }));
  tasks.push(task('hashtags', 'SCRIPT', 'Hashtaglar', { kind: 'hashtags' }));

  return tasks;
}

/** Social content: one visual plus everything needed to post it. */
function planSocial(intent) {
  const primary = intent.primaryModule === 'VIDEO' ? 'VIDEO' : 'IMAGE';

  const tasks = [
    task('main', primary, `${getModule(primary).label} yaratish`),
    task('caption', 'SCRIPT', 'Post matni', { kind: 'caption' }),
    task('hashtags', 'SCRIPT', 'Hashtaglar', { kind: 'hashtags' }),
  ];

  if (intent.modules.includes('VOICE')) {
    tasks.splice(1, 0, task('voiceover', 'VOICE', 'Diktor ovozi'));
  }
  if (intent.modules.includes('MUSIC')) {
    tasks.splice(1, 0, task('soundtrack', 'MUSIC', 'Fon musiqasi'));
  }

  return tasks;
}

function plan(intent) {
  let tasks;
  if (intent.goal === GOAL_ADVERT) tasks = planAdvert(intent);
  else if (intent.goal === GOAL_SOCIAL) tasks = planSocial(intent);
  else tasks = planSingle(intent);

  // De-duplicate on role so a module named twice can't produce two identical
  // steps, then sort into the execution order described above.
  const seen = new Set();
  const deduped = tasks.filter((item) => {
    if (seen.has(item.role)) return false;
    seen.add(item.role);
    return true;
  });

  deduped.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return deduped.map((item, index) => ({ ...item, step: index + 1 }));
}

/** Total credit cost of a plan, so the UI can quote a price up front. */
function planCost(tasks) {
  return estimateCredits(tasks.map((item) => item.module));
}

function planDuration(tasks) {
  return tasks.reduce((total, item) => total + (getModule(item.module)?.estimatedSeconds || 10), 0);
}

module.exports = { plan, planCost, planDuration, ROLE_ORDER };
