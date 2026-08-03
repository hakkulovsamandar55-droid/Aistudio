const express = require('express');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/admin.middleware');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get('/stats', adminController.getStats);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.post('/users/:id/credits', adminController.adjustCredits);
router.patch('/users/:id/active', adminController.setActive);
router.patch('/users/:id/role', adminController.setRole);
router.patch('/users/:id/plan', adminController.setPlan);

// Provider credentials. Responses only ever carry masked keys.
router.get('/providers', adminController.getProviders);
router.patch('/providers/:provider', adminController.updateProvider);

router.get('/economics', adminController.getEconomics);

router.get('/queue', adminController.getQueueStatus);

router.get('/generations', adminController.getGenerations);

router.get('/packages', adminController.getPackages);
router.post('/packages', adminController.createPackage);
router.patch('/packages/:id', adminController.updatePackage);

router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.patch('/announcements/:id', adminController.updateAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

module.exports = router;
