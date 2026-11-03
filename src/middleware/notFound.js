'use strict';

/**
 * Catch-all middleware for routes that do not exist.
 * Returns 404 with a JSON body instead of the default Express HTML page.
 */
function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = notFound;
