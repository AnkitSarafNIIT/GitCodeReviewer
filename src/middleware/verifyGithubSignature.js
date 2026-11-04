'use strict';

const { verifyHmacSignature, verifySecret } = require('../services/signature.service');

/**
 * Express middleware that accepts requests from two callers:
 *
 *  1. GitHub (production)
 *     Sends X-Hub-Signature-256: sha256=<HMAC-SHA256 of raw body>
 *     → verified with verifyHmacSignature against the raw body bytes.
 *
 *  2. Postman / Bruno / curl (manual testing)
 *     Sends X-Webhook-Secret: <plain secret value>
 *     → verified with verifySecret (direct constant-time comparison).
 *
 * Requests that supply neither header, or whose value does not match, get 401.
 */
function verifyGithubSignature(req, res, next) {
  const hmacHeader   = req.headers['x-hub-signature-256'];
  const secretHeader = req.headers['x-webhook-secret'];

  // --- path 1: GitHub sends HMAC signature ---
  if (hmacHeader) {
    if (!verifyHmacSignature(req.rawBody, hmacHeader)) {
      return res.status(401).json({ error: 'Invalid X-Hub-Signature-256' });
    }
    return next();
  }

  // --- path 2: manual caller sends plain secret ---
  if (secretHeader) {
    if (!verifySecret(secretHeader)) {
      return res.status(401).json({ error: 'Invalid X-Webhook-Secret' });
    }
    return next();
  }

  // --- neither header present ---
  return res.status(401).json({
    error: 'Authentication required: provide X-Hub-Signature-256 (GitHub) or X-Webhook-Secret (testing)',
  });
}

module.exports = verifyGithubSignature;
