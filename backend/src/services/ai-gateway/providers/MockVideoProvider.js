const IVideoProvider = require('./IVideoProvider');

/**
 * Returns a fake video URL after a short simulated delay, mimicking the
 * async nature of real video providers without any external calls.
 */
class MockVideoProvider extends IVideoProvider {
  async generateVideo(prompt, options = {}) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      provider: 'mock',
    };
  }
}

module.exports = MockVideoProvider;
