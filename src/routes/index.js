'use strict';

const { Router } = require('express');
const webhookRoutes = require('./webhook.routes');
const healthRoutes = require('./health.routes');

const router = Router();

router.use('/webhook', webhookRoutes);
router.use('/health', healthRoutes);

module.exports = router;
