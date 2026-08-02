const express = require('express');
const magicController = require('../controllers/magic.controller');

const router = express.Router();

// Public: the landing page advertises which modules are live.
router.get('/', magicController.listModules);

module.exports = router;
