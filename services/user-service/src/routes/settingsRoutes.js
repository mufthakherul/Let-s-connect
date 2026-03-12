const express = require('express');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

router.get('/', settingsController.getSettings);
router.put('/privacy', settingsController.updatePrivacy);
router.put('/security', settingsController.updateSecurity);
router.put('/appearance', settingsController.updateAppearance);
router.put('/notifications', settingsController.updateNotifications);
router.put('/locale', settingsController.updateLocale);
router.put('/accessibility', settingsController.updateAccessibility);
router.post('/data/export', settingsController.exportData);
router.post('/account/delete', settingsController.deleteAccount);

module.exports = router;
