/**
 * Base class for all operational errors thrown intentionally in services/controllers.
 * The global error handler uses `statusCode` to shape the HTTP response.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
