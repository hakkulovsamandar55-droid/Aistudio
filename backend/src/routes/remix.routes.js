const express = require('express');
const remixController = require('../controllers/remix.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkPlanLimit = require('../middleware/checkPlanLimit.middleware');
const checkCredits = require('../middleware/checkCredits.middleware');
const { handleRemixUpload } = require('../middleware/upload.middleware');
const { generateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authMiddleware);

router.get('/styles', remixController.listStyles);

// Same plan quota and credit cost as a plain image generation — Remix
// produces the same kind of asset, just from an uploaded source. Quota and
// credits are checked BEFORE the upload is accepted, so a user who can't
// afford it never has a file written to disk in the first place.
router.post(
  '/',
  generateLimiter,
  checkPlanLimit('IMAGE'),
  checkCredits('IMAGE'),
  handleRemixUpload,
  remixController.remix
);

module.exports = router;
