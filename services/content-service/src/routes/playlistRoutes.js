const express = require('express');
const playlistController = require('../controllers/playlistController');
const router = express.Router();

router.get('/user/:userId', playlistController.getUserPlaylists);
router.post('/', playlistController.createPlaylist);
router.get('/:id', playlistController.getPlaylistById);
router.post('/:id/videos', playlistController.addVideoToPlaylist);
router.delete('/:id/videos/:videoId', playlistController.removeVideoFromPlaylist);

module.exports = router;
