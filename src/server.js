'use strict';

// Load and validate environment variables before anything else.
const env = require('./config/env');
const db = require('./config/db');
const app = require('./app');

let server;

async function start() {
  await db.connect();

  server = app.listen(env.port, () => {
    console.log(`[server] Listening on http://localhost:${env.port}`);
  });
}

/**
 * Graceful shutdown — close the HTTP server first, then the DB connection.
 */
async function shutdown(signal) {
  console.log(`\n[server] Received ${signal}. Shutting down gracefully…`);
  if (server) {
    server.close(async () => {
      await db.disconnect();
      process.exit(0);
    });
  } else {
    await db.disconnect();
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
