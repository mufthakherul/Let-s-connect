const express = require('express');
const videoController = require('../controllers/videoController');
const router = express.Router();

router.post('/channels', videoController.createChannel);
router.post('/upload', videoController.uploadVideo);
router.post('/channels/:id/subscribe', videoController.subscribe);

module.exports = router;
