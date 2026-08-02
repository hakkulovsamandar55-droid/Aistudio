const axios = require('axios');
const IVoiceProvider = require('./IVoiceProvider');
const AppError = require('../../../utils/AppError');

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs' stock "Rachel" voice

class ElevenLabsVoiceProvider extends IVoiceProvider {
  constructor() {
    super();
    this.baseUrl = process.env.ELEVENLABS_API_BASE_URL || 'https://api.elevenlabs.io/v1';
    this.modelId = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  }

  async generateVoice(prompt, options = {}) {
    const voiceId = options.voice || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        { text: prompt, model_id: this.modelId },
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
          timeout: 60000,
        }
      );

      // ElevenLabs returns raw audio rather than a hosted URL, so the clip is
      // inlined as a data URI — the same shape the rest of the pipeline
      // already handles for base64 image results.
      const base64 = Buffer.from(response.data).toString('base64');
      return { url: `data:audio/mpeg;base64,${base64}`, provider: 'elevenlabs' };
    } catch (err) {
      throw new AppError(`Voice generation failed: ${err.message}`, 502);
    }
  }
}

module.exports = ElevenLabsVoiceProvider;
