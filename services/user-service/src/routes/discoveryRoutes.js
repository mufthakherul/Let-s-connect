const express = require('express');
const discoveryController = require('../controllers/discoveryController');

const router = express.Router();

router.get('/search', discoveryController.searchUsers);
router.get('/search/suggestions', discoveryController.searchSuggestions);
router.get('/pages/search', discoveryController.searchPages);
router.get('/discover/people', discoveryController.discoverPeople);

module.exports = router;
