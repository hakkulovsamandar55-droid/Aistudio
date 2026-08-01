/**
 * Interface every image provider must implement. Concrete providers
 * (OpenAIImageProvider, MockImageProvider, a future FluxImageProvider, ...)
 * extend this and are interchangeable from ImageGateway's point of view.
 */
class IImageProvider {
  /**
   * @param {string} prompt - the (already enhanced) prompt to generate from
   * @param {object} [options]
   * @param {string} [options.size] - e.g. "1024x1024"
   * @param {string} [options.quality] - e.g. "standard" | "hd"
   * @returns {Promise<{ url: string, provider: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async generateImage(prompt, options = {}) {
    throw new Error('generateImage() must be implemented by the provider subclass');
  }
}

module.exports = IImageProvider;
