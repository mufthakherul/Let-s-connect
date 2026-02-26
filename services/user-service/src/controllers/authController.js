const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const { User, Profile, NotificationPreference, UserPreferences } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');
const logger = require('../../../shared/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.register = catchAsync(async (req, res, next) => {
    const { username, email, password, firstName, lastName } = req.body;

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

    logger.info({ message: 'User registered', userId: user.id });

    response.success(res, { user: { id: user.id, username: user.username, email: user.email }, token }, 'User registered successfully', 201);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new AppError('Invalid email or password', 401, 'AUTHENTICATION_ERROR'));
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

    logger.info({ message: 'User logged in', userId: user.id });

    response.success(res, { user: { id: user.id, username: user.username, email: user.email, role: user.role }, token }, 'Login successful');
});
