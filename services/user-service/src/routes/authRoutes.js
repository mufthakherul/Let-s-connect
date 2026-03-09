const express = require('express');
const authController = require('../controllers/authController');
const {
	validateRegister,
	validateLogin,
	validateCheckUsername
} = require('../validators/authValidators');
const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/check-username', validateCheckUsername, authController.checkUsername);

module.exports = router;
