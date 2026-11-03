'use strict';

const crypto = require('crypto');
const env = require('../config/env');

/**
 * Compares the X-Webhook-Secret header directly against GITHUB_WEBHOOK_SECRET.
 *
 * Uses crypto.timingSafeEqual so the comparison takes constant time regardless
 * of where the strings diverge (prevents timing-based secret enumeration).
 *
 * @param {string} provided - Value of the X-Webhook-Secret request header
 * @returns {boolean}       - true if the secret matches
 */
function verifySecret(provided) {
  if (!provided) return false;

  const trusted  = Buffer.from(env.github.webhookSecret, 'utf8');
  const received = Buffer.from(provided, 'utf8');

  if (trusted.length !== received.length) return false;

  return crypto.timingSafeEqual(trusted, received);
}

module.exports = { verifySecret };
