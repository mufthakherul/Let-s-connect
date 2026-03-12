'use strict';

const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// ─── List & Read ──────────────────────────────────────────────────────────────
router.get('/', notificationController.getNotifications);
router.post('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// ─── Preferences ─────────────────────────────────────────────────────────────
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

module.exports = router;
