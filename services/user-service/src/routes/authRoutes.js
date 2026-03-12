const express = require('express');
const authController = require('../controllers/authController');
const oauthController = require('../controllers/oauthController');
const {
	validateRegister,
	validateLogin,
	validateCheckUsername
} = require('../validators/authValidators');
const router = express.Router();

// Core auth
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

// Password reset (OTP-based)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Email verification
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// 2FA
router.post('/2fa/setup', authController.setup2FA);
router.post('/2fa/verify', authController.verify2FA);
router.post('/2fa/disable', authController.disable2FA);

// Availability checks
router.get('/check-username', validateCheckUsername, authController.checkUsername);
router.get('/check-email', authController.checkEmail);

// Public stats
router.get('/public/stats', authController.getPublicStats);

// OAuth social login (Google, GitHub, Discord, Apple)
router.get('/oauth/:provider/authorize', oauthController.authorize);
router.get('/oauth/:provider/callback', oauthController.callback);
router.post('/oauth/:provider/callback', oauthController.callback); // Apple uses POST

module.exports = router;

