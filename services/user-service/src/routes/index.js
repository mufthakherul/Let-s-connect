const express = require('express');
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const socialRoutes = require('./socialRoutes');
const discoveryRoutes = require('./discoveryRoutes');
const pageRoutes = require('./pageRoutes');

const router = express.Router();

router.use('/', authRoutes);
router.use('/profile', profileRoutes);
router.use('/social', socialRoutes);
router.use('/pages', pageRoutes);
router.use('/', discoveryRoutes);

module.exports = router;
