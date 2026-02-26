const express = require('express');
const socialController = require('../controllers/socialController');
const router = express.Router();

// Skills
router.post('/:userId/skills', socialController.addSkill);
router.get('/:userId/skills', socialController.getSkills);
router.post('/skills/:skillId/endorse', socialController.endorseSkill);

// Friends
router.post('/friends/request', socialController.sendFriendRequest);
router.post('/friends/request/:requestId/accept', socialController.acceptFriendRequest);

module.exports = router;
