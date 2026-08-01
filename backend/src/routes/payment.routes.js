const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/packages', paymentController.getPackages);
router.post('/checkout', authMiddleware, paymentController.createCheckout);

module.exports = router;
