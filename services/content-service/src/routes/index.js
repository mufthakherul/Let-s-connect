const express = require('express');
const postRoutes = require('./postRoutes');
const commentRoutes = require('./commentRoutes');
const groupRoutes = require('./groupRoutes');
const communityRoutes = require('./communityRoutes');
const videoRoutes = require('./videoRoutes');
const blogRoutes = require('./blogRoutes');
const hubRoutes = require('./hubRoutes');
const playlistRoutes = require('./playlistRoutes');
const searchRoutes = require('./searchRoutes');
const discoveryRoutes = require('./discoveryRoutes');
const postController = require('../controllers/postController');
const { CachingStrategies } = require('../../../shared/caching');

const router = express.Router();

// Backward-compatible alias (legacy clients): /content/feed/:userId
router.get('/feed/:userId', (req, res, next) => {
    return req.cacheManager.middleware(CachingStrategies.POST_FEED.namespace, {
        keyGenerator: (request) => request.params.userId,
        ttl: CachingStrategies.POST_FEED.ttl
    })(req, res, next);
}, postController.getFeed);

router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/groups', groupRoutes);
router.use('/communities', communityRoutes);
router.use('/videos', videoRoutes);
router.use('/blogs', blogRoutes);
router.use('/hubs', hubRoutes);
router.use('/playlists', playlistRoutes);
router.use('/search', searchRoutes);
router.use('/discover', discoveryRoutes);

module.exports = router;
