const express = require('express');
const communityController = require('../controllers/communityController');
const router = express.Router();

router.post('/', communityController.createCommunity);
router.get('/', communityController.getCommunities);

module.exports = router;
