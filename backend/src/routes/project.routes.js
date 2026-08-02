const express = require('express');
const magicController = require('../controllers/magic.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', magicController.listProjects);
router.get('/:id', magicController.getProject);
router.delete('/:id', magicController.deleteProject);

module.exports = router;
