const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.post('/me/password', userController.changePassword);
router.get('/me/stats', userController.getStats);
router.get('/me/credits/history', userController.getCreditsHistory);
router.get('/me/generations', userController.getGenerations);
router.get('/me/referrals', userController.getReferrals);
router.post('/me/daily-bonus', userController.claimDailyBonus);

module.exports = router;
