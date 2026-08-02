const express = require('express');
const generationController = require('../controllers/generation.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkCredits = require('../middleware/checkCredits.middleware');
const { generateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authMiddleware);

router.get('/styles', generationController.listStyles);

// The rate limiter is scoped to the two endpoints that actually cost money.
// It must NOT cover /:id/status — the video page polls that every 5s, which
// would otherwise trip the limit mid-generation.
router.post('/image', generateLimiter, checkCredits('IMAGE'), generationController.generateImage);
router.post('/video', generateLimiter, checkCredits('VIDEO'), generationController.generateVideo);

router.get('/:id/status', generationController.getStatus);
router.get('/:id/download', generationController.download);
router.patch('/:id/favorite', generationController.setFavorite);
router.patch('/:id/public', generationController.setPublic);
router.delete('/:id', generationController.remove);

module.exports = router;
