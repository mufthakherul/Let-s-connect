const express = require('express');
const blogController = require('../controllers/blogController');
const router = express.Router();

router.post('/', blogController.createBlog);
router.get('/', blogController.getBlogs);

module.exports = router;
