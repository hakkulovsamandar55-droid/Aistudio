const TaskPollingVideoProvider = require('./TaskPollingVideoProvider');

/**
 * Google Veo — the top tier.
 *
 * TODO: Gemini API hujjatlariga qarab endpoint nomlarini tasdiqlash kerak.
 * Veo long-running operation qaytaradi va uni `operations/...` nomi bo'yicha
 * so'rab turish kerak; muvaffaqiyat `done: true` bilan belgilanadi.
 */
class VeoVideoProvider extends TaskPollingVideoProvider {
  constructor() {
    super({
      name: 'veo',
      baseURL: process.env.VEO_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      headers: { 'x-goog-api-key': process.env.VEO_API_KEY },
      pollIntervalMs: 10000,
      maxWaitMs: 8 * 60 * 1000,
    });
  }

  buildCreateRequest(prompt, options = {}) {
    const model = options.model || 'veo-3.0-generate-001';
    return {
      path: `/models/${model}:predictLongRunning`,
      body: {
        instances: [{ prompt }],
        parameters: {
          aspectRatio: options.aspectRatio || '16:9',
          durationSeconds: options.duration || 8,
        },
      },
    };
  }

  extractTaskId(data) {
    // Veo returns a fully-qualified operation name ("models/veo.../operations/abc").
    return data?.name;
  }

  buildStatusPath(taskId) {
    return `/${taskId}`;
  }

  interpretStatus(data) {
    if (!data?.done) {
      return { state: 'pending' };
    }

    if (data.error) {
      return { state: 'failed', reason: data.error.message };
    }

    const samples = data.response?.generateVideoResponse?.generatedSamples;
    return { state: 'succeeded', url: samples?.[0]?.video?.uri };
  }
}

module.exports = VeoVideoProvider;
