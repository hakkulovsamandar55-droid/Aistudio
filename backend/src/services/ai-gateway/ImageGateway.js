/**
 * Thin wrapper around whatever IImageProvider it was constructed with.
 * Callers depend on ImageGateway, never on a concrete provider directly,
 * so swapping OpenAI for another vendor is a one-line change in index.js.
 */
class ImageGateway {
  constructor(provider) {
    this.provider = provider;
  }

  async generateImage(prompt, options = {}) {
    return this.provider.generateImage(prompt, options);
  }
}

module.exports = ImageGateway;
