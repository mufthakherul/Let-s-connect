const express = require('express');
const socialController = require('../controllers/socialController');
const router = express.Router();

// ─── Skills ───────────────────────────────────────────────────────────────────
router.post('/:userId/skills', socialController.addSkill);
router.get('/:userId/skills', socialController.getSkills);
router.post('/skills/:skillId/endorse', socialController.endorseSkill);

// ─── Friends — Phase 2 ───────────────────────────────────────────────────────
router.get('/friends', socialController.getFriends);
router.get('/friends/suggestions', socialController.getFriendSuggestions);
router.get('/friends/requests', socialController.getFriendRequests);
router.get('/friends/:userId/mutual', socialController.getMutualFriends);

router.post('/friends/request', socialController.sendFriendRequest);
router.post('/friends/request/:requestId/accept', socialController.acceptFriendRequest);
router.post('/friends/request/:requestId/decline', socialController.declineFriendRequest);
router.delete('/friends/:userId', socialController.unfriend);

// ─── Follow/Unfollow ─────────────────────────────────────────────────────────
router.post('/friends/:userId/follow', socialController.followUser);
router.delete('/friends/:userId/follow', socialController.unfollowUser);

module.exports = router;

