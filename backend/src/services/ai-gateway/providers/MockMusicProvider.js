const IMusicProvider = require('./IMusicProvider');

/**
 * Returns a fixed sample track so the music pipeline can be exercised without
 * a Suno key or any network access.
 */
class MockMusicProvider extends IMusicProvider {
  async generateMusic(prompt, options = {}) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
      provider: 'mock',
    };
  }
}

module.exports = MockMusicProvider;
