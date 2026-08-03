const pino = require('pino');

/**
 * Structured logging.
 *
 * The old logger was a console.log wrapper: fine to read over someone's
 * shoulder, useless once something has gone wrong in production and you need
 * to find every line belonging to one request or one generation. pino emits
 * one JSON object per line, which any log stack can index and query.
 *
 * The `(message, meta)` call signature is kept exactly as it was — 50-odd
 * call sites already use it — and translated to pino's (mergingObject,
 * message) form here. Development still gets colourised human output via
 * pino-pretty; production gets raw JSON on stdout for the process manager to
 * collect.
 */

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const isDev = env === 'development';

function buildOptions() {
  const options = {
    // Assertions are the signal in tests, not request logs.
    level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
    base: undefined, // drop pid/hostname noise; the platform already tags these
    timestamp: pino.stdTimeFunctions.isoTime,
    // Anything that could carry a credential never reaches the log, no matter
    // which call site passes it.
    redact: {
      paths: [
        'password',
        'newPassword',
        'token',
        'accessToken',
        'refreshToken',
        'idToken',
        'apiKey',
        'apiKeyEnc',
        'authorization',
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.apiKey',
      ],
      censor: '[redacted]',
    },
  };

  // pino-pretty runs in a worker thread, so it is only wired up where the
  // readability is actually worth it.
  if (isDev) {
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    };
  }

  return options;
}

const base = pino(buildOptions());

/**
 * Bridges the old `(message, meta)` convention onto pino. `meta` has been
 * called with errors, strings and objects over the years, so all three are
 * given a sensible home rather than being stringified into the message.
 */
function emit(level, message, meta) {
  if (meta === undefined) {
    base[level](message);
    return;
  }

  if (meta instanceof Error) {
    base[level]({ err: meta }, message);
    return;
  }

  if (meta !== null && typeof meta === 'object') {
    base[level](meta, message);
    return;
  }

  base[level]({ detail: meta }, message);
}

const logger = {
  debug: (message, meta) => emit('debug', message, meta),
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),

  /**
   * A logger that stamps every line with the same fields — e.g. one
   * generation id across the whole render — so related lines can be pulled
   * out of a busy log with a single query.
   */
  child: (bindings) => {
    const childLogger = base.child(bindings);
    const childEmit = (level, message, meta) => {
      if (meta === undefined) return childLogger[level](message);
      if (meta instanceof Error) return childLogger[level]({ err: meta }, message);
      if (meta !== null && typeof meta === 'object') return childLogger[level](meta, message);
      return childLogger[level]({ detail: meta }, message);
    };

    return {
      debug: (message, meta) => childEmit('debug', message, meta),
      info: (message, meta) => childEmit('info', message, meta),
      warn: (message, meta) => childEmit('warn', message, meta),
      error: (message, meta) => childEmit('error', message, meta),
    };
  },

  // Escape hatch for anything that wants pino directly.
  raw: base,
};

module.exports = logger;
