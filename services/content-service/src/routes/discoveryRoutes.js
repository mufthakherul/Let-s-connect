const express = require('express');
const searchController = require('../controllers/searchController');

const router = express.Router();

router.get('/groups', searchController.discoverGroups);
router.get('/content', searchController.discoverContent);

module.exports = router;
