const IVoiceProvider = require('./IVoiceProvider');

/**
 * Returns a fixed sample clip so the voice pipeline can be exercised without
 * an ElevenLabs key or any network access.
 */
class MockVoiceProvider extends IVoiceProvider {
  async generateVoice(prompt, options = {}) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
      provider: 'mock',
    };
  }
}

module.exports = MockVoiceProvider;
