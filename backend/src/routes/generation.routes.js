const express = require('express');
const generationController = require('../controllers/generation.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkCredits = require('../middleware/checkCredits.middleware');
const checkPlanLimit = require('../middleware/checkPlanLimit.middleware');
const { generateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authMiddleware);

router.get('/styles', generationController.listStyles);

// Free — no checkPlanLimit/checkCredits. It calls the OpenAI enhancer
// (real cost to us) but never a paid generation provider, so it stays
// behind the rate limiter without the credit gate the actual generation
// endpoints below have.
router.post('/enhance', generateLimiter, generationController.enhancePrompt);

// The rate limiter is scoped to the two endpoints that actually cost money.
// It must NOT cover /:id/status — the video page polls that every 5s, which
// would otherwise trip the limit mid-generation.
// Plan limit first, then credits: a free user out of daily quota should be
// told to come back tomorrow, not that their credits are wrong.
router.post(
  '/image',
  generateLimiter,
  checkPlanLimit('IMAGE'),
  checkCredits('IMAGE'),
  generationController.generateImage
);
router.post(
  '/video',
  generateLimiter,
  checkPlanLimit('VIDEO'),
  checkCredits('VIDEO'),
  generationController.generateVideo
);

router.get('/:id/status', generationController.getStatus);
router.get('/:id/download', generationController.download);
router.patch('/:id/favorite', generationController.setFavorite);
router.patch('/:id/public', generationController.setPublic);
router.delete('/:id', generationController.remove);

module.exports = router;
