const OpenAI = require('openai');
const IImageProvider = require('./IImageProvider');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  const status = err?.status;
  return status === 429 || (status >= 500 && status < 600) || err?.code === 'ECONNRESET';
}

class OpenAIImageProvider extends IImageProvider {
  constructor() {
    super();
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  }

  async generateImage(prompt, options = {}) {
    const { size = '1024x1024', quality = 'standard' } = options;

    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await this.client.images.generate({
          model: this.model,
          prompt,
          size,
          quality,
          n: 1,
        });

        const image = response.data[0];
        const url = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null);

        if (!url) {
          throw new AppError('OpenAI returned no image data', 502);
        }

        return { url, provider: 'openai' };
      } catch (err) {
        lastError = err;

        if (err?.status === 400 && /content_policy|safety/i.test(err?.message || '')) {
          throw new AppError('Image request was rejected by OpenAI content policy. Try a different prompt.', 422);
        }

        if (attempt < MAX_RETRIES && isRetryable(err)) {
          const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
          logger.warn(`OpenAI image generation failed (attempt ${attempt + 1}), retrying in ${delay}ms`, err.message);
          await sleep(delay);
          continue;
        }

        break;
      }
    }

    throw new AppError(`Image generation failed: ${lastError?.message || 'unknown error'}`, 502);
  }
}

module.exports = OpenAIImageProvider;
