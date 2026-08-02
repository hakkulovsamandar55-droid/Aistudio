const TaskPollingVideoProvider = require('./TaskPollingVideoProvider');
const providerSettings = require('../../providerSettings.service');

const SUCCESS_STATES = new Set(['succeed', 'succeeded', 'success', 'completed']);
const FAILURE_STATES = new Set(['failed', 'fail', 'error']);

/**
 * Kling (Kuaishou) text-to-video.
 *
 * TODO: Kling hujjatlariga qarab endpoint va javob maydonlarini tasdiqlash
 * kerak — bu struktura ularning e'lon qilingan "create task / query task"
 * naqshiga asoslangan.
 */
class KlingVideoProvider extends TaskPollingVideoProvider {
  constructor() {
    super({
      name: 'kling',
      baseURL: providerSettings.getBaseUrl('kling', 'https://api.klingai.com/v1'),
      headers: { Authorization: `Bearer ${providerSettings.getApiKey('kling')}` },
      pollIntervalMs: 5000,
      maxWaitMs: 6 * 60 * 1000,
    });
  }

  buildCreateRequest(prompt, options = {}) {
    return {
      path: '/videos/text2video',
      body: {
        prompt,
        model_name: options.model || 'kling-v2-master',
        duration: String(options.duration || 5),
        aspect_ratio: options.aspectRatio || '16:9',
        mode: 'std',
      },
    };
  }

  extractTaskId(data) {
    return data?.data?.task_id || data?.task_id;
  }

  buildStatusPath(taskId) {
    return `/videos/text2video/${taskId}`;
  }

  interpretStatus(data) {
    const payload = data?.data || data;
    const state = String(payload?.task_status || '').toLowerCase();

    if (SUCCESS_STATES.has(state)) {
      const videos = payload?.task_result?.videos;
      return { state: 'succeeded', url: Array.isArray(videos) ? videos[0]?.url : undefined };
    }
    if (FAILURE_STATES.has(state)) {
      return { state: 'failed', reason: payload?.task_status_msg };
    }
    return { state: 'pending' };
  }
}

module.exports = KlingVideoProvider;
