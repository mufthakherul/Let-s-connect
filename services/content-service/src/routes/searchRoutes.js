const express = require('express');
const searchController = require('../controllers/searchController');

const router = express.Router();

router.get('/', searchController.search);
router.post('/elasticsearch', searchController.elasticsearch);
router.post('/reindex', searchController.reindexSearch);
router.get('/suggestions', searchController.suggestions);
router.get('/trending', searchController.trending);

router.get('/history', searchController.getHistory);
router.post('/history', searchController.saveHistory);

router.get('/saved', searchController.getSavedSearches);
router.post('/saved', searchController.createSavedSearch);
router.delete('/saved/:id', searchController.deleteSavedSearch);
router.post('/saved/:id/execute', searchController.executeSavedSearch);

module.exports = router;
