'use strict';

const crypto = require('crypto');
const env = require('../config/env');

/**
 * Verifies the X-Hub-Signature-256 header that GitHub sends.
 *
 * GitHub computes HMAC-SHA256(secret, rawBody) and puts the hex digest in the
 * header as "sha256=<hex>". We recompute the same digest from the raw request
 * bytes and compare with timingSafeEqual to prevent timing attacks.
 *
 * @param {Buffer} rawBody   - Raw request body bytes (captured before JSON parsing)
 * @param {string} signature - Value of the X-Hub-Signature-256 header
 * @returns {boolean}
 */
function verifyHmacSignature(rawBody, signature) {
  if (!signature || !signature.startsWith('sha256=')) return false;

  const expected = crypto
    .createHmac('sha256', env.github.webhookSecret)
    .update(rawBody)
    .digest('hex');

  const trusted  = Buffer.from(`sha256=${expected}`, 'utf8');
  const received = Buffer.from(signature, 'utf8');

  if (trusted.length !== received.length) return false;

  return crypto.timingSafeEqual(trusted, received);
}

/**
 * Compares the X-Webhook-Secret header directly against GITHUB_WEBHOOK_SECRET.
 * Used for manual testing from Postman / Bruno — no hashing needed.
 *
 * @param {string} provided - Value of the X-Webhook-Secret header
 * @returns {boolean}
 */
function verifySecret(provided) {
  if (!provided) return false;

  const trusted  = Buffer.from(env.github.webhookSecret, 'utf8');
  const received = Buffer.from(provided, 'utf8');

  if (trusted.length !== received.length) return false;

  return crypto.timingSafeEqual(trusted, received);
}

module.exports = { verifyHmacSignature, verifySecret };
