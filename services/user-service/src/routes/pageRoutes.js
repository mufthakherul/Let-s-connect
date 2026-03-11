const express = require('express');
const pageController = require('../controllers/pageController');
const router = express.Router();

// ─── Pages — Phase 2 ─────────────────────────────────────────────────────────
router.get('/', pageController.listPages);
router.post('/', pageController.createPage);
router.get('/:id', pageController.getPage);
router.put('/:id', pageController.updatePage);

// Followers
router.post('/:id/follow', pageController.followPage);
router.post('/:id/unfollow', pageController.unfollowPage);

// Feed, insights, scheduling
router.get('/:id/feed', pageController.getPageFeed);
router.get('/:id/insights', pageController.getPageInsights);
router.post('/:id/schedule', pageController.schedulePost);

module.exports = router;
