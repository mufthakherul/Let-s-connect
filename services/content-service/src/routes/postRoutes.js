const express = require('express');
const postController = require('../controllers/postController');
const { CachingStrategies, InvalidationPatterns } = require('../../../shared/caching');
const router = express.Router();

router.post('/', (req, res, next) => {
    return req.cacheManager.invalidateMiddleware(() => InvalidationPatterns.POST())(req, res, next);
}, postController.createPost);

router.get('/feed/:userId', (req, res, next) => {
    return req.cacheManager.middleware(CachingStrategies.POST_FEED.namespace, {
        keyGenerator: (req) => req.params.userId,
        ttl: CachingStrategies.POST_FEED.ttl
    })(req, res, next);
}, postController.getFeed);

router.post('/:postId/reactions', postController.reactToPost);

module.exports = router;
