'use strict';

const { Schema, model } = require('mongoose');

const webhookDeliverySchema = new Schema({
  deliveryId: { type: String, required: true, unique: true },
  event: { type: String },
  repositoryFullName: { type: String },
  // 'processed' — commits were saved; 'ignored' — filtered out (wrong branch, ping, etc.)
  status: { type: String, enum: ['processed', 'ignored'] },
  createdAt: {
    type: Date,
    default: Date.now,
    // Auto-delete documents after 30 days
    expires: 60 * 60 * 24 * 30,
  },
});

module.exports = model('WebhookDelivery', webhookDeliverySchema);
