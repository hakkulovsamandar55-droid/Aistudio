const express = require('express');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public: the banner is shown to everyone, including logged-out visitors.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, message: true, createdAt: true },
    });
    res.json({ success: true, data: items });
  })
);

module.exports = router;
