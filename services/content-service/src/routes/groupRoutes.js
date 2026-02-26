const express = require('express');
const groupController = require('../controllers/groupController');
const router = express.Router();

router.post('/', groupController.createGroup);
router.get('/', groupController.getGroups);
router.post('/:id/join', groupController.joinGroup);
router.post('/:id/events', groupController.createEvent);

module.exports = router;
