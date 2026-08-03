const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

/**
 * Error tracking. Optional: without SENTRY_DSN nothing initialises and every
 * function here is a no-op, so dev and the test suite are unaffected and no
 * data leaves the machine.
 *
 * What this buys over reading logs: a 500 in production arrives as a grouped,
 * de-duplicated issue with a stack trace and the request that caused it,
 * instead of a line someone has to notice.
 */

let initialised = false;

function isEnabled() {
  return Boolean(process.env.SENTRY_DSN);
}

function init({ context = 'api' } = {}) {
  if (initialised || !isEnabled()) return false;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    // Performance tracing is off by default: it is billed separately and this
    // is about knowing when something breaks, not profiling.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    initialScope: { tags: { component: context } },

    beforeSend(event) {
      // Belt and braces alongside the logger's redaction — an exception's
      // request snapshot must never carry a bearer token or cookie.
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      if (event.request?.data?.password) event.request.data.password = '[redacted]';
      return event;
    },
  });

  initialised = true;
  logger.info(`Sentry initialised for ${context}`);
  return true;
}

/**
 * Reports an exception, attaching the request that triggered it. Never throws
 * — a monitoring failure must not become a second failure on the way out.
 */
function captureException(err, { req, extra } = {}) {
  if (!initialised) return;

  try {
    Sentry.withScope((scope) => {
      if (req) {
        scope.setContext('request', {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
        });
        if (req.user?.id) scope.setUser({ id: req.user.id });
      }
      if (extra) scope.setContext('extra', extra);
      Sentry.captureException(err);
    });
  } catch (reportErr) {
    logger.warn(`Could not report error to Sentry: ${reportErr.message}`);
  }
}

/** Gives queued events a chance to reach Sentry before the process exits. */
async function flush(timeoutMs = 2000) {
  if (!initialised) return;
  await Sentry.flush(timeoutMs).catch(() => {});
}

module.exports = { init, isEnabled, captureException, flush, Sentry };
