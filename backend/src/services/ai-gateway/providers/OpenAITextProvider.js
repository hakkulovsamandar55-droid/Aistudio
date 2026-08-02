const OpenAI = require('openai');
const ITextProvider = require('./ITextProvider');
const AppError = require('../../../utils/AppError');

class OpenAITextProvider extends ITextProvider {
  constructor() {
    super();
    this.model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
  }

  // Constructed lazily so a missing key only fails when the provider is
  // actually used, never at import time.
  get client() {
    if (!this._client) {
      this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._client;
  }

  async generateText(prompt, options = {}) {
    const { system, temperature = 0.8, json = false } = options;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new AppError('OpenAI returned an empty completion', 502);
      }

      return { text, provider: 'openai' };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Text generation failed: ${err.message}`, 502);
    }
  }
}

module.exports = OpenAITextProvider;
