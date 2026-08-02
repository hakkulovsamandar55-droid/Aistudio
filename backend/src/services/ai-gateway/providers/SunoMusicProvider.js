const axios = require('axios');
const IMusicProvider = require('./IMusicProvider');
const AppError = require('../../../utils/AppError');
const providerSettings = require('../../providerSettings.service');

const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 3 * 60 * 1000;

class SunoMusicProvider extends IMusicProvider {
  constructor() {
    super();
    this.client = axios.create({
      baseURL: providerSettings.getBaseUrl('suno', 'https://api.sunoapi.org/api/v1'),
      headers: {
        Authorization: `Bearer ${providerSettings.getApiKey('suno')}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async generateMusic(prompt, options = {}) {
    // TODO: Suno hujjatlariga qarab endpoint nomlarini tasdiqlash kerak —
    // bu struktura ularning umumiy "create task, then poll" naqshiga mos.
    let taskId;
    try {
      const created = await this.client.post('/generate', {
        prompt,
        instrumental: options.instrumental ?? true,
        customMode: false,
      });
      taskId = created.data?.data?.taskId || created.data?.id;
      if (!taskId) {
        throw new AppError('Suno did not return a task id', 502);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to start music generation: ${err.message}`, 502);
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let status;
      try {
        status = await this.client.get(`/generate/record-info?taskId=${taskId}`);
      } catch (err) {
        throw new AppError(`Failed to poll music task: ${err.message}`, 502);
      }

      const payload = status.data?.data || {};
      const state = payload.status || payload.state;

      if (state === 'SUCCESS' || state === 'complete') {
        const url = payload.response?.sunoData?.[0]?.audioUrl || payload.audioUrl;
        if (!url) {
          throw new AppError('Music task completed but returned no audio URL', 502);
        }
        return { url, provider: 'suno' };
      }

      if (state === 'FAILED' || state === 'error') {
        throw new AppError('Music generation failed', 502);
      }
    }

    throw new AppError('Music generation timed out', 504);
  }
}

module.exports = SunoMusicProvider;
