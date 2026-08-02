/**
 * Interface for text/reasoning providers — scripts, captions, hashtags,
 * translations and the intent analysis itself all route through this.
 */
class ITextProvider {
  /**
   * @param {string} prompt - the user-facing instruction
   * @param {object} [options]
   * @param {string} [options.system] - system prompt / role instruction
   * @param {number} [options.temperature]
   * @param {boolean} [options.json] - ask the model for strict JSON output
   * @returns {Promise<{ text: string, provider: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async generateText(prompt, options = {}) {
    throw new Error('generateText() must be implemented by the provider subclass');
  }
}

module.exports = ITextProvider;
