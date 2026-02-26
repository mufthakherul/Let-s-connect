const express = require('express');
const hubController = require('../controllers/hubController');
const router = express.Router();

router.post('/forum/posts', hubController.createForumPost);
router.post('/posts/:postId/award', hubController.giveAward);

module.exports = router;
