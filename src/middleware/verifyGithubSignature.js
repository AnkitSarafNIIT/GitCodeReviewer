'use strict';

const { verifySecret } = require('../services/signature.service');

/**
 * Express middleware that rejects requests whose X-Webhook-Secret header
 * does not match GITHUB_WEBHOOK_SECRET.
 *
 * Pass the raw secret value in the header — no hashing or encoding needed.
 */
function verifyGithubSignature(req, res, next) {
  const provided = req.headers['x-webhook-secret'];

  if (!provided) {
    return res.status(401).json({ error: 'Missing X-Webhook-Secret header' });
  }

  if (!verifySecret(provided)) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  next();
}

module.exports = verifyGithubSignature;
