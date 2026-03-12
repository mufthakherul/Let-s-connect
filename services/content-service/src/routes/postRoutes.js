const express = require('express');
const postController = require('../controllers/postController');
const { CachingStrategies, InvalidationPatterns } = require('../../../shared/caching');
const router = express.Router();

router.post('/', (req, res, next) => {
    return req.cacheManager.invalidateMiddleware(() => InvalidationPatterns.POST())(req, res, next);
}, postController.createPost);

router.get('/feed', postController.getFeed);
router.get('/feed/:userId', (req, res, next) => {
    return req.cacheManager.middleware(CachingStrategies.POST_FEED.namespace, {
        keyGenerator: (req) => req.params.userId,
        ttl: CachingStrategies.POST_FEED.ttl
    })(req, res, next);
}, postController.getFeed);

router.get('/:postId', postController.getPost);
router.put('/:postId', postController.updatePost);
router.delete('/:postId', postController.deletePost);
router.post('/:postId/reactions', postController.reactToPost);
router.post('/:postId/share', postController.sharePost);
router.post('/:postId/report', postController.reportPost);

module.exports = router;
