const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// express.raw() is required here (instead of the app-wide express.json())
// because Stripe's signature check runs against the exact raw request body.
router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.stripeWebhook);

module.exports = router;
