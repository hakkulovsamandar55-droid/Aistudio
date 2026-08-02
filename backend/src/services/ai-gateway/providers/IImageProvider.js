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

  /**
   * True image-to-image transformation (Remix). Optional: a provider that
   * only supports text-to-image should leave this unimplemented — the
   * gateway detects that and degrades to a style-guided generateImage() call
   * instead of failing the feature outright.
   *
   * @param {string} sourceImageUrl - publicly reachable URL of the uploaded image
   * @param {string} prompt - the transformation instruction
   * @param {object} [options]
   * @param {string} [options.sourceImagePath] - local filesystem path, for
   *   providers whose API needs raw image bytes rather than a URL
   * @returns {Promise<{ url: string, provider: string }>}
   */
}

module.exports = IImageProvider;
