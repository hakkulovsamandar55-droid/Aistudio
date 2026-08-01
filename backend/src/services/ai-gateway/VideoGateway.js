/**
 * Thin wrapper around whatever IVideoProvider it was constructed with.
 * Callers depend on VideoGateway, never on a concrete provider directly,
 * so swapping Runway for another vendor is a one-line change in index.js.
 */
class VideoGateway {
  constructor(provider) {
    this.provider = provider;
  }

  async generateVideo(prompt, options = {}) {
    return this.provider.generateVideo(prompt, options);
  }
}

module.exports = VideoGateway;
