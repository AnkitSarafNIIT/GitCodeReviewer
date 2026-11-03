'use strict';

require('dotenv').config();

const REQUIRED = ['MONGODB_URI', 'GITHUB_WEBHOOK_SECRET'];

/**
 * Validates that every required environment variable is present.
 * Exits the process with a clear message if any are missing.
 */
function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `[startup] Missing required environment variables: ${missing.join(', ')}\n` +
        `Copy .env.example to .env and fill in the values, then restart.`
    );
    process.exit(1);
  }
}

validateEnv();

const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'git_code_reviewer',
  },
  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },
  // Parse the optional branch filter into a Set for O(1) lookups.
  // An empty string or missing key means "accept all branches".
  reviewBranches: process.env.REVIEW_BRANCHES
    ? new Set(
        process.env.REVIEW_BRANCHES.split(',').map((b) => b.trim()).filter(Boolean)
      )
    : new Set(),
};

module.exports = env;
