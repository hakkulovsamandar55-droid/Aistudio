const express = require('express');
const generationService = require('../services/generation.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public on purpose — the gallery is the app's shop window, and the service
// layer already restricts the payload to non-identifying fields.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 48);

    const { items, pagination } = await generationService.listPublicGenerations({
      page,
      limit,
      type: req.query.type,
    });

    res.json({ success: true, data: items, pagination });
  })
);

module.exports = router;
