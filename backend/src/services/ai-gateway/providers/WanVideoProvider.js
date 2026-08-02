const TaskPollingVideoProvider = require('./TaskPollingVideoProvider');
const providerSettings = require('../../providerSettings.service');

const SUCCESS_STATES = new Set(['succeeded', 'success']);
const FAILURE_STATES = new Set(['failed', 'canceled', 'unknown']);

/**
 * Wan (Alibaba DashScope) text-to-video — the cheap, fast tier.
 *
 * TODO: DashScope hujjatlariga qarab endpoint va header'larni tasdiqlash
 * kerak. DashScope asinxron topshiriqlar uchun maxsus `X-DashScope-Async`
 * sarlavhasini talab qiladi.
 */
class WanVideoProvider extends TaskPollingVideoProvider {
  constructor() {
    super({
      name: 'wan',
      baseURL: providerSettings.getBaseUrl('wan', 'https://dashscope-intl.aliyuncs.com/api/v1'),
      headers: {
        Authorization: `Bearer ${providerSettings.getApiKey('wan')}`,
        'X-DashScope-Async': 'enable',
      },
      pollIntervalMs: 4000,
      maxWaitMs: 5 * 60 * 1000,
    });
  }

  buildCreateRequest(prompt, options = {}) {
    return {
      path: '/services/aigc/video-generation/video-synthesis',
      body: {
        model: options.model || 'wan2.2-t2v-plus',
        input: { prompt },
        parameters: {
          size: options.aspectRatio === '9:16' ? '720*1280' : '1280*720',
          duration: options.duration || 5,
        },
      },
    };
  }

  extractTaskId(data) {
    return data?.output?.task_id;
  }

  buildStatusPath(taskId) {
    return `/tasks/${taskId}`;
  }

  interpretStatus(data) {
    const output = data?.output || {};
    const state = String(output.task_status || '').toLowerCase();

    if (SUCCESS_STATES.has(state)) {
      return { state: 'succeeded', url: output.video_url || output.results?.[0]?.url };
    }
    if (FAILURE_STATES.has(state)) {
      return { state: 'failed', reason: output.message };
    }
    return { state: 'pending' };
  }
}

module.exports = WanVideoProvider;
