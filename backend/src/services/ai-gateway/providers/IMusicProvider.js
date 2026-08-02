/**
 * Interface every music-generation provider must implement (Suno today,
 * anything else tomorrow).
 */
class IMusicProvider {
  /**
   * @param {string} prompt - description of the desired track
   * @param {object} [options]
   * @param {number} [options.duration] - length in seconds
   * @param {string} [options.mood]
   * @returns {Promise<{ url: string, provider: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async generateMusic(prompt, options = {}) {
    throw new Error('generateMusic() must be implemented by the provider subclass');
  }
}

module.exports = IMusicProvider;
