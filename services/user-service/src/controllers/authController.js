const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const { User, Profile, NotificationPreference, UserPreferences, PasswordResetToken, RefreshToken } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');
const logger = require('../../../shared/logger');
const { getRequiredEnv } = require('../../../shared/security-utils');
const { sanitizeText, sanitizeEmail } = require('../../../shared/sanitization');

const JWT_SECRET = getRequiredEnv('JWT_SECRET');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Lazy-load email service to avoid startup failures when not configured
let emailService = null;
function getEmailService() {
    if (!emailService) {
        try { emailService = require('../../email-service'); } catch (e) { /* email not required */ }
    }
    return emailService;
}

// ------- helpers -------
function generateAccessToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(userId) {
    return jwt.sign({ id: userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

function safeOtp(length = 6) {
    // Use cryptographically secure randomness
    return String(crypto.randomInt(0, Math.pow(10, length))).padStart(length, '0');
}

// ------- controllers -------

exports.register = catchAsync(async (req, res, next) => {
    const username = sanitizeText(req.body.username, { maxLength: 30, lowercase: true });
    const email = sanitizeEmail(req.body.email);
    const password = req.body.password;
    const firstName = sanitizeText(req.body.firstName, { maxLength: 50 });
    const lastName = sanitizeText(req.body.lastName, { maxLength: 50 });

    const existingUser = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existingUser) {
        return next(new AppError('User already exists with this username or email', 409, 'CONFLICT'));
    }

    const user = await User.create({ username, email, password, firstName, lastName });

    // Create associated records
    await Profile.create({ userId: user.id });
    await NotificationPreference.create({ userId: user.id });
    await UserPreferences.create({ userId: user.id });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const rawRefreshToken = generateRefreshToken(user.id);
    await RefreshToken.create({
        token: rawRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null
    });

    // Send verification email (non-blocking)
    const emailOtp = safeOtp(6);
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.update({
        emailVerificationCode: emailOtp,
        emailVerificationCodeExpiresAt: verifyExpiry
    });
    try {
        const svc = getEmailService();
        if (svc) {
            await svc.sendEmail(email, 'verification', { user: { firstName }, data: { code: emailOtp } });
        }
    } catch (e) { /* non-critical */ }

    logger.info('User registered', { userId: user.id, requestId: req.id });

    return response.success(req, res, {
        user: { id: user.id, username: user.username, email: user.email },
        token: accessToken,
        refreshToken: rawRefreshToken
    }, {}, 201);
});

exports.login = catchAsync(async (req, res, next) => {
    const email = sanitizeEmail(req.body.email);
    const password = req.body.password;
    const rememberMe = Boolean(req.body.rememberMe);

    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new AppError('Invalid email or password', 401, 'AUTHENTICATION_ERROR'));
    }

    if (!user.isActive) {
        return next(new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED'));
    }

    // 2FA check
    if (user.twoFactorEnabled) {
        const twoFactorToken = req.body.twoFactorCode;
        if (!twoFactorToken) {
            return response.success(req, res, {
                requires2FA: true,
                userId: user.id
            }, {}, 200);
        }
        const valid = authenticator.verify({ token: twoFactorToken, secret: user.twoFactorSecret });
        if (!valid) {
            return next(new AppError('Invalid 2FA code', 401, 'INVALID_2FA'));
        }
    }

    const accessToken = generateAccessToken(user.id);
    const refreshExpiry = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const rawRefreshToken = generateRefreshToken(user.id);
    await RefreshToken.create({
        token: rawRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshExpiry),
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null
    });

    logger.info('User logged in', { userId: user.id, requestId: req.id });

    return response.success(req, res, {
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        token: accessToken,
        refreshToken: rawRefreshToken
    });
});

exports.logout = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        await RefreshToken.update({ revoked: true }, { where: { token: refreshToken } });
    }
    return response.success(req, res, { message: 'Logged out successfully' });
});

exports.refresh = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return next(new AppError('Refresh token required', 400, 'VALIDATION_ERROR'));
    }

    let payload;
    try {
        payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
        return next(new AppError('Invalid or expired refresh token', 401, 'TOKEN_EXPIRED'));
    }

    // Validate that this is actually a refresh token, not an access token
    if (payload.type !== 'refresh') {
        return next(new AppError('Invalid token type', 401, 'TOKEN_TYPE_INVALID'));
    }

    const stored = await RefreshToken.findOne({
        where: { token: refreshToken, revoked: false }
    });
    if (!stored || stored.expiresAt < new Date()) {
        return next(new AppError('Refresh token revoked or expired', 401, 'TOKEN_EXPIRED'));
    }

    // Rotate token
    await stored.update({ revoked: true });
    const newAccessToken = generateAccessToken(payload.id);
    const newRefreshToken = generateRefreshToken(payload.id);
    await RefreshToken.create({
        token: newRefreshToken,
        userId: payload.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null
    });

    return response.success(req, res, { token: newAccessToken, refreshToken: newRefreshToken });
});

exports.forgotPassword = catchAsync(async (req, res) => {
    const email = sanitizeEmail(req.body.email);
    const user = await User.findOne({ where: { email } });

    // Always return 200 to prevent user enumeration
    if (!user) {
        return response.success(req, res, { message: 'If an account exists, a reset code has been sent.' });
    }

    const otp = safeOtp(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await PasswordResetToken.destroy({ where: { userId: user.id, used: false } });
    await PasswordResetToken.create({
        token: otp,
        userId: user.id,
        expiresAt,
        used: false
    });

    try {
        const svc = getEmailService();
        if (svc) {
            await svc.sendEmail(email, 'passwordReset', { user: { firstName: user.firstName }, data: otp });
        }
    } catch (e) { /* non-critical */ }

    logger.info('Password reset OTP sent', { userId: user.id, requestId: req.id });
    return response.success(req, res, { message: 'If an account exists, a reset code has been sent.' });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const email = sanitizeEmail(req.body.email);
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
        return next(new AppError('OTP and new password are required', 400, 'VALIDATION_ERROR'));
    }
    if (newPassword.length < 8) {
        return next(new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR'));
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
        return next(new AppError('Invalid OTP', 400, 'INVALID_OTP'));
    }

    const resetToken = await PasswordResetToken.findOne({
        where: { userId: user.id, token: otp, used: false }
    });
    if (!resetToken || resetToken.expiresAt < new Date()) {
        return next(new AppError('Invalid or expired OTP', 400, 'INVALID_OTP'));
    }

    await user.update({ password: newPassword });
    await resetToken.update({ used: true });
    // Revoke all refresh tokens for security
    await RefreshToken.update({ revoked: true }, { where: { userId: user.id } });

    logger.info('Password reset successfully', { userId: user.id, requestId: req.id });
    return response.success(req, res, { message: 'Password reset successfully' });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
    const { token, code } = req.body;

    let user;
    if (code) {
        user = await User.findOne({
            where: {
                emailVerificationCode: code,
                emailVerificationCodeExpiresAt: { [Op.gt]: new Date() }
            }
        });
    } else if (token) {
        user = await User.findOne({
            where: {
                emailVerificationToken: token,
                emailVerificationTokenExpiresAt: { [Op.gt]: new Date() }
            }
        });
    }

    if (!user) {
        return next(new AppError('Invalid or expired verification code', 400, 'INVALID_TOKEN'));
    }

    await user.update({
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationCode: null,
        emailVerificationCodeExpiresAt: null,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null
    });

    logger.info('Email verified', { userId: user.id, requestId: req.id });
    return response.success(req, res, { message: 'Email verified successfully' });
});

exports.resendVerification = catchAsync(async (req, res, next) => {
    const email = sanitizeEmail(req.body.email);
    const user = await User.findOne({ where: { email } });

    if (!user) {
        return response.success(req, res, { message: 'If an account exists, a verification email has been sent.' });
    }
    if (user.isEmailVerified) {
        return next(new AppError('Email is already verified', 400, 'ALREADY_VERIFIED'));
    }

    // Throttle: only allow resend every 60 seconds
    if (user.lastVerificationSentAt && (Date.now() - user.lastVerificationSentAt.getTime() < 60000)) {
        return next(new AppError('Please wait before requesting another code', 429, 'RATE_LIMITED'));
    }

    const otp = safeOtp(6);
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.update({
        emailVerificationCode: otp,
        emailVerificationCodeExpiresAt: verifyExpiry,
        lastVerificationSentAt: new Date()
    });

    try {
        const svc = getEmailService();
        if (svc) {
            await svc.sendEmail(email, 'verification', { user: { firstName: user.firstName }, data: { code: otp } });
        }
    } catch (e) { /* non-critical */ }

    return response.success(req, res, { message: 'If an account exists, a verification email has been sent.' });
});

exports.setup2FA = catchAsync(async (req, res, next) => {
    // Use gateway-forwarded identity header exclusively — never trust body.userId
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    const user = await User.findByPk(userId);
    if (!user) return next(new AppError('User not found', 404, 'NOT_FOUND'));
    if (user.twoFactorEnabled) return next(new AppError('2FA is already enabled', 400, 'ALREADY_ENABLED'));

    const secret = authenticator.generateSecret();
    const otpAuthUri = authenticator.keyuri(user.email, 'Milonexa', secret);

    // Store secret temporarily (not enabled yet until verified)
    await user.update({ twoFactorSecret: secret });

    return response.success(req, res, {
        secret,
        otpAuthUri,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUri)}`
    });
});

exports.verify2FA = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const { code } = req.body;

    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    if (!code) return next(new AppError('TOTP code is required', 400, 'VALIDATION_ERROR'));

    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
        return next(new AppError('2FA setup not initiated', 400, 'SETUP_REQUIRED'));
    }

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) {
        return next(new AppError('Invalid TOTP code', 400, 'INVALID_CODE'));
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    await user.update({ twoFactorEnabled: true, backupCodes });

    return response.success(req, res, {
        message: '2FA enabled successfully',
        backupCodes
    });
});

exports.disable2FA = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const { password } = req.body;

    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    const user = await User.findByPk(userId);
    if (!user) return next(new AppError('User not found', 404, 'NOT_FOUND'));

    if (password && !(await bcrypt.compare(password, user.password))) {
        return next(new AppError('Invalid password', 401, 'AUTHENTICATION_ERROR'));
    }

    await user.update({ twoFactorEnabled: false, twoFactorSecret: null, backupCodes: [] });
    return response.success(req, res, { message: '2FA disabled successfully' });
});

exports.checkUsername = catchAsync(async (req, res, next) => {
    const username = (req.query?.username || '').trim();
    if (!username) {
        return next(new AppError('Username is required', 400, 'VALIDATION_ERROR'));
    }

    const existingUser = await User.findOne({ where: { username } });
    const available = !existingUser;

    return response.success(req, res, { available }, 'Username availability checked');
});

exports.checkEmail = catchAsync(async (req, res, next) => {
    const email = (req.query?.email || '').trim().toLowerCase();
    if (!email) {
        return next(new AppError('Email is required', 400, 'VALIDATION_ERROR'));
    }

    const existing = await User.findOne({ where: { email } });
    return response.success(req, res, { available: !existing });
});

// Public stats endpoint (no auth required)
exports.getPublicStats = catchAsync(async (req, res) => {
    const userCount = await User.count({ where: { isActive: true } });
    return response.success(req, res, {
        userCount,
        uptime: process.uptime(),
        version: '2.0.0',
        platform: 'Milonexa'
    });
});

