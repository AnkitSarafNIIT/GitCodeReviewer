'use strict';

const webhookService = require('../services/webhook.service');

/**
 * POST /api/webhook
 *
 * Entry point for all GitHub webhook deliveries.
 * Responsibility is limited to reading headers/body, calling the service,
 * and returning the appropriate HTTP response.
 */
async function handleWebhook(req, res, next) {
  try {
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];

    // GitHub sends a "ping" event when a webhook is first created.
    if (event === 'ping') {
      return res.status(200).json({ message: 'pong' });
    }

    // Only handle push events; acknowledge everything else without processing.
    if (event !== 'push') {
      return res.status(200).json({ received: true, event, message: 'event ignored' });
    }

    // Idempotency check — skip if this delivery was already processed.
    const isDuplicate = await webhookService.isDeliveryDuplicate(deliveryId);
    if (isDuplicate) {
      return res.status(200).json({ received: true, message: 'duplicate delivery, skipped' });
    }

    const payload = req.body;
    if (!payload || !payload.ref || !payload.repository) {
      return res.status(400).json({ error: 'Malformed push payload' });
    }

    const result = await webhookService.processPushEvent(deliveryId, payload);

    return res.status(200).json({ received: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { handleWebhook };
