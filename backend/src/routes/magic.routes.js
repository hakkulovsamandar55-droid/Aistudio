const express = require('express');
const magicController = require('../controllers/magic.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { generateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authMiddleware);

// Preview is free and read-only, so it stays outside the generation limiter —
// the UI calls it while the user is still typing.
router.post('/preview', magicController.preview);

router.post('/run', generateLimiter, magicController.run);

module.exports = router;
