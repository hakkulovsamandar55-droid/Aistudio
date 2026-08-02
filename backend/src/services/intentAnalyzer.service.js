const { textGateway } = require('./ai-gateway');
const { MODULE_IDS } = require('../config/modules.config');
const { findStyle, getStyles } = require('../config/styles.config');
const logger = require('../utils/logger');

/**
 * Turns a plain sentence into a structured intent — the first stage of the
 * pipeline and the reason users never write prompts.
 *
 * It asks an LLM for structured JSON, then *validates and repairs* that
 * output against the module registry. If the model is unavailable or returns
 * nonsense, a keyword classifier takes over, so the platform always produces
 * a usable plan rather than an error.
 */

const GOAL_ADVERT = 'ADVERT';
const GOAL_SOCIAL = 'SOCIAL';
const GOAL_SINGLE = 'SINGLE';

// Uzbek + English + Russian cues, because the audience mixes all three.
const KEYWORDS = {
  VIDEO: [
    'video', 'klip', 'rolik', 'film', 'kino', 'animatsiya', 'animation', 'movie',
    'reels', 'shorts', 'tiktok', 'trailer', 'треил', 'видео', 'ролик',
  ],
  IMAGE: [
    'rasm', 'surat', 'foto', 'image', 'picture', 'photo', 'poster', 'logo',
    'logotip', 'illustration', 'illyustratsiya', 'banner', 'картин', 'фото',
  ],
  VOICE: [
    'ovoz', 'voice', 'audio', 'nutq', 'speech', 'diktor', 'narration', 'озвуч', 'голос',
  ],
  MUSIC: [
    'musiqa', 'music', 'qo\'shiq', 'song', 'soundtrack', 'melodiya', 'melody', 'бит', 'музык',
  ],
  SCRIPT: [
    'ssenariy', 'script', 'matn', 'text', 'maqola', 'article', 'post', 'caption',
    'izoh', 'hashtag', 'tarjima', 'translate', 'сценар', 'текст',
  ],
};

const ADVERT_CUES = [
  'reklama', 'advert', 'commercial', 'ad ', 'kampaniya', 'campaign', 'marketing',
  'promo', 'brend', 'brand', 'sotuv', 'реклам', 'кампан',
];

const SOCIAL_CUES = [
  'instagram', 'tiktok', 'youtube', 'reels', 'shorts', 'telegram', 'facebook',
  'post', 'stories', 'soc set', 'ijtimoiy tarmoq',
];

const ASPECT_CUES = [
  { match: ['tiktok', 'reels', 'shorts', 'stories', 'vertikal', 'vertical'], value: '9:16' },
  { match: ['youtube', 'kino', 'cinematic', 'gorizontal', 'horizontal', 'landscape'], value: '16:9' },
  { match: ['instagram post', 'kvadrat', 'square'], value: '1:1' },
];

const SYSTEM_PROMPT = `You classify a user's creative request for an AI content platform.
Reply with STRICT JSON only, no prose, using exactly this shape:
{
  "goal": "SINGLE" | "ADVERT" | "SOCIAL",
  "modules": ["IMAGE" | "VIDEO" | "VOICE" | "MUSIC" | "SCRIPT", ...],
  "primaryModule": "IMAGE" | "VIDEO" | "VOICE" | "MUSIC" | "SCRIPT",
  "style": "one of the provided style ids or null",
  "aspectRatio": "9:16" | "16:9" | "1:1",
  "title": "a short human title for this project, max 6 words",
  "subject": "the core subject, rewritten as a clean short phrase"
}
Pick the smallest set of modules that genuinely satisfies the request.`;

function normalise(text) {
  return String(text || '').toLowerCase();
}

function countHits(haystack, needles) {
  return needles.reduce((total, needle) => (haystack.includes(needle) ? total + 1 : total), 0);
}

/**
 * Keyword classifier used when the LLM is unavailable. Deterministic and
 * offline, so Magic Mode still works with no API keys configured.
 */
function heuristicIntent(userRequest) {
  const text = normalise(userRequest);

  const scores = Object.fromEntries(
    Object.entries(KEYWORDS).map(([moduleId, words]) => [moduleId, countHits(text, words)])
  );

  const isAdvert = countHits(text, ADVERT_CUES) > 0;
  const isSocial = countHits(text, SOCIAL_CUES) > 0;

  let primaryModule;
  if (scores.VIDEO > 0) primaryModule = 'VIDEO';
  else if (scores.IMAGE > 0) primaryModule = 'IMAGE';
  else if (scores.MUSIC > 0) primaryModule = 'MUSIC';
  else if (scores.VOICE > 0) primaryModule = 'VOICE';
  else if (scores.SCRIPT > 0) primaryModule = 'SCRIPT';
  // A bare idea with no medium named ("a cat cooking pizza in space") is
  // overwhelmingly an image request — it's the cheapest way to show the user
  // something, and they can escalate to video from the result.
  else primaryModule = 'IMAGE';

  let goal = GOAL_SINGLE;
  if (isAdvert) goal = GOAL_ADVERT;
  else if (isSocial) goal = GOAL_SOCIAL;

  const modules = new Set([primaryModule]);
  if (goal === GOAL_ADVERT) {
    modules.add('SCRIPT');
    modules.add('IMAGE');
    if (scores.VIDEO > 0) modules.add('VIDEO');
  } else if (goal === GOAL_SOCIAL) {
    modules.add('SCRIPT');
  }
  // Explicitly named extra modules are always honoured.
  Object.entries(scores).forEach(([moduleId, score]) => {
    if (score > 0) modules.add(moduleId);
  });

  const aspect = ASPECT_CUES.find((rule) => countHits(text, rule.match) > 0);

  return {
    goal,
    modules: [...modules],
    primaryModule,
    style: guessStyle(text, primaryModule),
    aspectRatio: aspect ? aspect.value : primaryModule === 'VIDEO' ? '16:9' : '1:1',
    title: buildTitle(userRequest),
    subject: userRequest.trim(),
    source: 'heuristic',
  };
}

function guessStyle(text, moduleId) {
  const styles = getStyles(moduleId === 'VIDEO' ? 'VIDEO' : 'IMAGE');
  const direct = styles.find((style) => style.id !== 'auto' && text.includes(style.id.replace('_', ' ')));
  if (direct) return direct.id;

  const named = [
    { cues: ['anime', 'manga'], style: 'anime' },
    { cues: ['cartoon', 'multfilm', 'pixar'], style: 'digital_art' },
    { cues: ['realistic', 'realistik', 'foto'], style: 'photorealistic' },
    { cues: ['cyberpunk', 'neon', 'kiberpank'], style: 'cyberpunk' },
    { cues: ['3d', 'render'], style: 'render_3d' },
    { cues: ['marvel', 'kino', 'cinematic', 'film'], style: moduleId === 'VIDEO' ? 'cinematic' : 'digital_art' },
    { cues: ['dron', 'drone', 'aerial'], style: 'drone' },
  ].find((rule) => countHits(text, rule.cues) > 0);

  if (named && findStyle(moduleId === 'VIDEO' ? 'VIDEO' : 'IMAGE', named.style)) {
    return named.style;
  }
  return 'auto';
}

function buildTitle(userRequest) {
  const words = userRequest.trim().split(/\s+/).slice(0, 6).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Coerces whatever the model returned into a shape the planner can trust. */
function sanitiseIntent(raw, userRequest, fallback) {
  if (!raw || typeof raw !== 'object') return fallback;

  const modules = Array.isArray(raw.modules)
    ? raw.modules.filter((moduleId) => MODULE_IDS.includes(moduleId))
    : [];

  const primaryModule = MODULE_IDS.includes(raw.primaryModule)
    ? raw.primaryModule
    : modules[0] || fallback.primaryModule;

  if (!modules.includes(primaryModule)) modules.unshift(primaryModule);
  if (modules.length === 0) return fallback;

  const goal = [GOAL_SINGLE, GOAL_ADVERT, GOAL_SOCIAL].includes(raw.goal) ? raw.goal : fallback.goal;
  const styleType = primaryModule === 'VIDEO' ? 'VIDEO' : 'IMAGE';
  const style = findStyle(styleType, raw.style) ? raw.style : fallback.style;

  return {
    goal,
    modules,
    primaryModule,
    style,
    aspectRatio: ['9:16', '16:9', '1:1'].includes(raw.aspectRatio)
      ? raw.aspectRatio
      : fallback.aspectRatio,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fallback.title,
    subject:
      typeof raw.subject === 'string' && raw.subject.trim() ? raw.subject.trim() : userRequest.trim(),
    source: 'model',
  };
}

async function analyze(userRequest) {
  const fallback = heuristicIntent(userRequest);

  try {
    const styleIds = getStyles('IMAGE')
      .concat(getStyles('VIDEO'))
      .map((style) => style.id);

    const { text } = await textGateway.generateText(
      `Request: "${userRequest}"\nAvailable style ids: ${[...new Set(styleIds)].join(', ')}`,
      { system: SYSTEM_PROMPT, json: true, temperature: 0.2, kind: 'intent' }
    );

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // The mock provider returns prose, not JSON — that's expected offline.
      return fallback;
    }

    return sanitiseIntent(parsed, userRequest, fallback);
  } catch (err) {
    logger.warn(`Intent analysis fell back to heuristics: ${err.message}`);
    return fallback;
  }
}

module.exports = { analyze, heuristicIntent, sanitiseIntent, GOAL_ADVERT, GOAL_SOCIAL, GOAL_SINGLE };
