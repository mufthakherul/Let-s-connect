const express = require('express');
const groupController = require('../controllers/groupController');
const router = express.Router();

// ─── Core CRUD ────────────────────────────────────────────────────────────────
router.post('/', groupController.createGroup);
router.get('/', groupController.getGroups);
router.get('/:id', groupController.getGroup);
router.put('/:id', groupController.updateGroup);

// ─── Membership ───────────────────────────────────────────────────────────────
router.post('/:id/join', groupController.joinGroup);
router.post('/:id/leave', groupController.leaveGroup);
router.get('/:id/members', groupController.getMembers);
router.post('/:id/members/:userId/promote', groupController.promoteMember);
router.delete('/:id/members/:userId', groupController.removeMember);

// ─── Join Request Management ──────────────────────────────────────────────────
router.get('/:id/join-requests', groupController.getJoinRequests);
router.post('/:id/join-requests/:userId/resolve', groupController.resolveJoinRequest);

// ─── Feed & Events ────────────────────────────────────────────────────────────
router.get('/:id/feed', groupController.getGroupFeed);
router.post('/:id/post', groupController.createGroupPost);
router.post('/:id/events', groupController.createEvent);

// ─── Moderation & Analytics ───────────────────────────────────────────────────
router.get('/:id/moderation/queue', groupController.getModerationQueue);
router.post('/:id/moderation/posts/:postId', groupController.moderatePost);
router.get('/:id/analytics', groupController.getGroupAnalytics);

module.exports = router;

