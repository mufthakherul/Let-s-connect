const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const { User, Profile, NotificationPreference, UserPreferences } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');
const logger = require('../../../shared/logger');
const { getRequiredEnv } = require('../../../shared/security-utils');
// Workstream E: Input sanitization
const { sanitizeText, sanitizeEmail } = require('../../../shared/sanitization');

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

exports.register = catchAsync(async (req, res, next) => {
    // Workstream E: Sanitize inputs
    const username = sanitizeText(req.body.username, { maxLength: 30, lowercase: true });
    const email = sanitizeEmail(req.body.email);
    const password = req.body.password; // Don't sanitize passwords (needed as-is for hashing)
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

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

    logger.info('User registered', { userId: user.id, requestId: req.id });

    // Workstream E: Use new response format
    return response.success(req, res, { 
        user: { id: user.id, username: user.username, email: user.email }, 
        token 
    }, {}, 201);
});

exports.login = catchAsync(async (req, res, next) => {
    // Workstream E: Sanitize email input
    const email = sanitizeEmail(req.body.email);
    const password = req.body.password;

    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new AppError('Invalid email or password', 401, 'AUTHENTICATION_ERROR'));
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

    logger.info('User logged in', { userId: user.id, requestId: req.id });

    // Workstream E: Use new response format
    return response.success(req, res, { 
        user: { id: user.id, username: user.username, email: user.email, role: user.role }, 
        token 
    });
});

exports.checkUsername = catchAsync(async (req, res, next) => {
    const username = (req.query?.username || '').trim();

    if (!username) {
        return next(new AppError('Username is required', 400, 'VALIDATION_ERROR'));
    }

    const existingUser = await User.findOne({ where: { username } });
    const available = !existingUser;

    response.success(res, { available }, 'Username availability checked');
});
