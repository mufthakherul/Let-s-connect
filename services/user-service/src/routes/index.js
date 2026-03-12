const express = require('express');
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const socialRoutes = require('./socialRoutes');
const discoveryRoutes = require('./discoveryRoutes');
const pageRoutes = require('./pageRoutes');
const settingsRoutes = require('./settingsRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.use('/', authRoutes);
router.use('/profile', profileRoutes);
router.use('/social', socialRoutes);
router.use('/pages', pageRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/', discoveryRoutes);

module.exports = router;
