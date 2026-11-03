'use strict';

const mongoose = require('mongoose');
const env = require('./env');

/**
 * Opens a Mongoose connection to MongoDB.
 * Resolves when the connection is ready; rejects on error.
 */
async function connect() {
  await mongoose.connect(env.mongodb.uri, {
    dbName: env.mongodb.dbName,
  });
  console.log(`[db] Connected to MongoDB — database: ${env.mongodb.dbName}`);
}

/**
 * Gracefully closes the Mongoose connection.
 * Called during SIGINT / SIGTERM shutdown.
 */
async function disconnect() {
  await mongoose.disconnect();
  console.log('[db] MongoDB connection closed');
}

module.exports = { connect, disconnect };
