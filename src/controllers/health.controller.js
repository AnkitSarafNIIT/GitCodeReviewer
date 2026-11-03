'use strict';

const mongoose = require('mongoose');

/**
 * GET /api/health
 * Returns the service status and the current MongoDB connection state.
 */
async function getHealth(req, res) {
  // Mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const mongoState = stateMap[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    mongo: mongoState,
    uptime: Math.floor(process.uptime()),
  });
}

module.exports = { getHealth };
