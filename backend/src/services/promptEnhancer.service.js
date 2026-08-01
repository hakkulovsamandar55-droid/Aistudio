const OpenAI = require('openai');
const logger = require('../utils/logger');

// Constructed lazily so the server can boot without OPENAI_API_KEY set —
// enhancement fails soft (see catch block below) when it's actually called
// without a key, rather than crashing the whole process on startup.
let _client;
function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const MODEL = process.env.OPENAI_ENHANCER_MODEL || 'gpt-4o-mini';

const IMAGE_SYSTEM_PROMPT =
  "Sen professional AI rasm generatsiya prompt yozuvchisisan. Foydalanuvchi bergan oddiy g'oyani " +
  'quyidagi elementlar bilan boyit: yorug\'lik, kompozitsiya, uslub, ranglar, kamera burchagi, sifat ' +
  'darajasi. Faqat yakuniy promptni qaytar, boshqa hech narsa yozma.';

const VIDEO_SYSTEM_PROMPT =
  "Sen professional AI video generatsiya prompt yozuvchisisan. Foydalanuvchi bergan oddiy g'oyani " +
  'quyidagi elementlar bilan boyit: kamera harakati, sahna o\'tishlari, davomiylik, kino uslubi, yorug\'lik, ' +
  'ranglar. Faqat yakuniy promptni qaytar, boshqa hech narsa yozma.';

async function enhanceWithSystemPrompt(userInput, systemPrompt) {
  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
      temperature: 0.8,
    });

    const enhanced = response.choices[0]?.message?.content?.trim();
    if (!enhanced) {
      throw new Error('Empty response from enhancer model');
    }

    return { originalPrompt: userInput, enhancedPrompt: enhanced };
  } catch (err) {
    // The enhancer is a nice-to-have layer on top of generation, not a hard
    // dependency — if it's unavailable we fall back to the raw user prompt
    // so the pipeline never grinds to a halt because of it.
    logger.error('Prompt enhancement failed, falling back to original prompt', err.message);
    return { originalPrompt: userInput, enhancedPrompt: userInput };
  }
}

async function enhanceImagePrompt(userInput) {
  return enhanceWithSystemPrompt(userInput, IMAGE_SYSTEM_PROMPT);
}

async function enhanceVideoPrompt(userInput) {
  return enhanceWithSystemPrompt(userInput, VIDEO_SYSTEM_PROMPT);
}

module.exports = { enhanceImagePrompt, enhanceVideoPrompt };
