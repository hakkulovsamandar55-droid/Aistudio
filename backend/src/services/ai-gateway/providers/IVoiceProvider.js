/**
 * Interface every text-to-speech provider must implement (ElevenLabs today,
 * anything else tomorrow). Concrete providers extend this and are
 * interchangeable from the gateway's point of view.
 */
class IVoiceProvider {
  /**
   * @param {string} prompt - the text to speak
   * @param {object} [options]
   * @param {string} [options.voice] - provider-specific voice id/name
   * @param {string} [options.language]
   * @returns {Promise<{ url: string, provider: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async generateVoice(prompt, options = {}) {
    throw new Error('generateVoice() must be implemented by the provider subclass');
  }
}

module.exports = IVoiceProvider;
