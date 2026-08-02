const axios = require('axios');
const IVideoProvider = require('./IVideoProvider');
const AppError = require('../../../utils/AppError');

/**
 * Shared base for video providers that follow the "create a task, then poll
 * for it" pattern — which is nearly all of them, because rendering takes
 * minutes rather than milliseconds.
 *
 * Subclasses declare *what* is provider-specific (endpoints, request body,
 * how to read a task id / status / output URL) and inherit the loop, the
 * timeout handling and the error mapping. `RunwayVideoProvider` predates this
 * and keeps its own copy; new providers extend this instead.
 */
class TaskPollingVideoProvider extends IVideoProvider {
  /**
   * @param {object} config
   * @param {string} config.name        - provider id used in the registry
   * @param {string} config.baseURL
   * @param {object} [config.headers]
   * @param {number} [config.pollIntervalMs]
   * @param {number} [config.maxWaitMs]
   */
  constructor({ name, baseURL, headers = {}, pollIntervalMs = 5000, maxWaitMs = 5 * 60 * 1000 }) {
    super();
    this.name = name;
    this.pollIntervalMs = pollIntervalMs;
    this.maxWaitMs = maxWaitMs;
    this.client = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 30000,
    });
  }

  /* ----- hooks a subclass must implement ----- */

  /** @returns {{ path: string, body: object }} */
  // eslint-disable-next-line no-unused-vars
  buildCreateRequest(prompt, options) {
    throw new Error(`${this.name}: buildCreateRequest() must be implemented`);
  }

  /** @returns {string|undefined} the task id from the create response */
  // eslint-disable-next-line no-unused-vars
  extractTaskId(data) {
    throw new Error(`${this.name}: extractTaskId() must be implemented`);
  }

  /** @returns {string} the polling path for a task */
  // eslint-disable-next-line no-unused-vars
  buildStatusPath(taskId) {
    throw new Error(`${this.name}: buildStatusPath() must be implemented`);
  }

  /** @returns {{ state: 'succeeded'|'failed'|'pending', url?: string, reason?: string }} */
  // eslint-disable-next-line no-unused-vars
  interpretStatus(data) {
    throw new Error(`${this.name}: interpretStatus() must be implemented`);
  }

  /* ----- shared flow ----- */

  async generateVideo(prompt, options = {}) {
    const taskId = await this.createTask(prompt, options);
    return this.awaitCompletion(taskId);
  }

  async createTask(prompt, options) {
    const { path, body } = this.buildCreateRequest(prompt, options);

    let response;
    try {
      response = await this.client.post(path, body);
    } catch (err) {
      throw new AppError(`Failed to start ${this.name} video generation: ${err.message}`, 502);
    }

    const taskId = this.extractTaskId(response.data);
    if (!taskId) {
      throw new AppError(`${this.name} did not return a task id`, 502);
    }
    return taskId;
  }

  async awaitCompletion(taskId) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.maxWaitMs) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));

      let response;
      try {
        // eslint-disable-next-line no-await-in-loop
        response = await this.client.get(this.buildStatusPath(taskId));
      } catch (err) {
        throw new AppError(`Failed to poll ${this.name} task status: ${err.message}`, 502);
      }

      const { state, url, reason } = this.interpretStatus(response.data || {});

      if (state === 'succeeded') {
        if (!url) {
          throw new AppError(`${this.name} task completed but returned no video URL`, 502);
        }
        return { url, provider: this.name };
      }

      if (state === 'failed') {
        throw new AppError(`${this.name} video generation failed${reason ? `: ${reason}` : ''}`, 502);
      }
      // pending — keep polling
    }

    throw new AppError(
      `${this.name} video generation timed out after ${Math.round(this.maxWaitMs / 60000)} minutes`,
      504
    );
  }
}

module.exports = TaskPollingVideoProvider;
