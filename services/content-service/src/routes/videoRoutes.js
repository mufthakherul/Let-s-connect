const express = require('express');
const videoController = require('../controllers/videoController');
const router = express.Router();

router.post('/channels', videoController.createChannel);
router.post('/upload', videoController.uploadVideo);
router.post('/channels/:id/subscribe', videoController.subscribe);

// Added missing routes based on frontend expectations
router.get('/public/videos', videoController.getPublicVideos);
router.get('/channels', videoController.getChannels);
router.get('/channels/:id', videoController.getChannelById);
router.delete('/channels/:id/subscribe', videoController.unsubscribe);
router.post('/', videoController.uploadVideo); // Frontend POSTs to /content/videos which maps to /videos/

module.exports = router;
