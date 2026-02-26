const express = require('express');
const commentController = require('../controllers/commentController');
const router = express.Router();

router.post('/:postId/comments', commentController.addComment);
router.get('/:postId/comments', commentController.getComments);

module.exports = router;
