const express = require('express');
const postRoutes = require('./postRoutes');
const commentRoutes = require('./commentRoutes');
const groupRoutes = require('./groupRoutes');
const communityRoutes = require('./communityRoutes');
const videoRoutes = require('./videoRoutes');
const blogRoutes = require('./blogRoutes');
const hubRoutes = require('./hubRoutes');
const playlistRoutes = require('./playlistRoutes');

const router = express.Router();

router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/groups', groupRoutes);
router.use('/communities', communityRoutes);
router.use('/videos', videoRoutes);
router.use('/blogs', blogRoutes);
router.use('/hubs', hubRoutes);
router.use('/playlists', playlistRoutes);

module.exports = router;
