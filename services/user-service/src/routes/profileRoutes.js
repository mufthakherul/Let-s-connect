const express = require('express');
const profileController = require('../controllers/profileController');
const { CachingStrategies, InvalidationPatterns } = require('../../../shared/caching');
const router = express.Router();

router.get('/:userId', (req, res, next) => {
    return req.cacheManager.middleware(CachingStrategies.USER_PROFILE.namespace, {
        keyGenerator: (req) => req.params.userId,
        ttl: CachingStrategies.USER_PROFILE.ttl
    })(req, res, next);
}, profileController.getProfile);

router.put('/:userId', (req, res, next) => {
    return req.cacheManager.invalidateMiddleware(() => InvalidationPatterns.USER(req.params.userId))(req, res, next);
}, profileController.updateProfile);

module.exports = router;
