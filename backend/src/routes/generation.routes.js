const express = require('express');
const generationController = require('../controllers/generation.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkCredits = require('../middleware/checkCredits.middleware');
const { generateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authMiddleware);
router.use(generateLimiter);

router.post('/image', checkCredits('IMAGE'), generationController.generateImage);
router.post('/video', checkCredits('VIDEO'), generationController.generateVideo);
router.get('/:id/status', generationController.getStatus);

module.exports = router;
