'use strict';

const { Router } = require('express');
const verifyGithubSignature = require('../middleware/verifyGithubSignature');
const { handleWebhook } = require('../controllers/webhook.controller');

const router = Router();

// Signature verification runs before the controller for every request to this route.
router.post('/', verifyGithubSignature, handleWebhook);

module.exports = router;
