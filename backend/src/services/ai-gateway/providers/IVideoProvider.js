/**
 * Interface every video provider must implement. Concrete providers
 * (RunwayVideoProvider, MockVideoProvider, a future KlingVideoProvider, ...)
 * extend this and are interchangeable from VideoGateway's point of view.
 */
class IVideoProvider {
  /**
   * @param {string} prompt - the (already enhanced) prompt to generate from
   * @param {object} [options]
   * @param {number} [options.duration] - desired clip length in seconds
   * @returns {Promise<{ url: string, provider: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async generateVideo(prompt, options = {}) {
    throw new Error('generateVideo() must be implemented by the provider subclass');
  }
}

module.exports = IVideoProvider;
