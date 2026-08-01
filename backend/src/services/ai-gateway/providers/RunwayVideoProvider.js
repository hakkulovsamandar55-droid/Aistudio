const axios = require('axios');
const IVideoProvider = require('./IVideoProvider');
const AppError = require('../../../utils/AppError');

const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 5 * 60 * 1000;

class RunwayVideoProvider extends IVideoProvider {
  constructor() {
    super();
    this.baseUrl = process.env.RUNWAY_API_BASE_URL || 'https://api.dev.runwayml.com/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async generateVideo(prompt, options = {}) {
    const { duration = 5 } = options;

    // TODO: Runway API hujjatlariga qarab endpoint URL'ni tasdiqlash kerak —
    // bu struktura eng zamonaviy REST konvensiyalariga asoslangan taxmin.
    let taskId;
    try {
      const createResponse = await this.client.post('/image_to_video', {
        prompt_text: prompt,
        duration,
      });
      taskId = createResponse.data?.id;
      if (!taskId) {
        throw new AppError('Runway did not return a task id', 502);
      }
    } catch (err) {
      throw new AppError(`Failed to start Runway video generation: ${err.message}`, 502);
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let statusResponse;
      try {
        statusResponse = await this.client.get(`/tasks/${taskId}`);
      } catch (err) {
        throw new AppError(`Failed to poll Runway task status: ${err.message}`, 502);
      }

      const { status, output } = statusResponse.data || {};

      if (status === 'SUCCEEDED' || status === 'completed') {
        const url = Array.isArray(output) ? output[0] : output;
        if (!url) {
          throw new AppError('Runway task completed but returned no video URL', 502);
        }
        return { url, provider: 'runway' };
      }

      if (status === 'FAILED' || status === 'failed') {
        throw new AppError('Runway video generation failed', 502);
      }
      // otherwise still PENDING/RUNNING — keep polling
    }

    throw new AppError('Runway video generation timed out after 5 minutes', 504);
  }
}

module.exports = RunwayVideoProvider;
