'use strict';

/**
 * Centralized Express error-handling middleware.
 * Must be registered after all routes (4-argument signature tells Express it is
 * an error handler).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Avoid leaking stack traces in production
  const body =
    process.env.NODE_ENV === 'production'
      ? { error: message }
      : { error: message, stack: err.stack };

  console.error(`[error] ${status} — ${message}`);
  res.status(status).json(body);
}

module.exports = errorHandler;
