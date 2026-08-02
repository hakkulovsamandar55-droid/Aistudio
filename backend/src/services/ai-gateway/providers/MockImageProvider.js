const IImageProvider = require('./IImageProvider');

/**
 * Returns a fake image URL after a short simulated delay. Used to exercise
 * the gateway/generation pipeline end-to-end without spending real API
 * credits or requiring an OPENAI_API_KEY during development.
 */
class MockImageProvider extends IImageProvider {
  async generateImage(prompt, options = {}) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const seed = encodeURIComponent(prompt.slice(0, 40));
    return {
      url: `https://picsum.photos/seed/${seed}/1024/1024`,
      provider: 'mock',
    };
  }

  async remixImage(sourceImageUrl, prompt, options = {}) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Deterministic per source+style so re-running a remix in dev looks stable.
    const seed = encodeURIComponent(`${sourceImageUrl}-${prompt}`.slice(0, 60));
    return {
      url: `https://picsum.photos/seed/${seed}/1024/1024`,
      provider: 'mock',
    };
  }
}

module.exports = MockImageProvider;
