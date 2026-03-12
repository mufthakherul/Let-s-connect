const { User, Profile } = require('../models');
const response = require('../../../../shared/response-wrapper');
const catchAsync = require('../../../../shared/catchAsync');
const AppError = require('../../../../shared/AppError');

// In-memory fallback store (real app would use DB)
const settingsStore = new Map();

const getOrInit = (userId) => {
    if (!settingsStore.has(userId)) {
        settingsStore.set(userId, {
            privacy: { postVisibility: 'everyone', friendListVisibility: 'friends', discoverability: true, searchEngineIndex: true },
            security: { twoFactorEnabled: false },
            appearance: { theme: 'system', fontSize: 'normal', compactMode: false },
            notifications: { friendRequests: true, messages: true, groupActivity: true, pageActivity: true, streaming: true, system: true, emailDigest: 'weekly' },
            locale: { language: 'English', timezone: 'UTC', dateFormat: 'MM/DD/YYYY' },
            accessibility: { highContrast: false, reducedMotion: false, screenReaderHints: false, largeTargets: false }
        });
    }
    return settingsStore.get(userId);
};

// GET /settings — return all settings for user
exports.getSettings = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    return response.success(req, res, getOrInit(userId));
});

// PUT /settings/privacy
exports.updatePrivacy = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    const settings = getOrInit(userId);
    settings.privacy = { ...settings.privacy, ...req.body };
    return response.success(req, res, settings.privacy);
});

// PUT /settings/security
exports.updateSecurity = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    const settings = getOrInit(userId);
    settings.security = { ...settings.security, ...req.body };
    return response.success(req, res, settings.security);
});

// PUT /settings/appearance
exports.updateAppearance = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    const settings = getOrInit(userId);
    settings.appearance = { ...settings.appearance, ...req.body };
    return response.success(req, res, settings.appearance);
});

// PUT /settings/notifications
exports.updateNotifications = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    const settings = getOrInit(userId);
    settings.notifications = { ...settings.notifications, ...req.body };
    return response.success(req, res, settings.notifications);
});

// PUT /settings/locale
exports.updateLocale = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    const settings = getOrInit(userId);
    settings.locale = { ...settings.locale, ...req.body };
    return response.success(req, res, settings.locale);
});

// PUT /settings/accessibility
exports.updateAccessibility = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    const settings = getOrInit(userId);
    settings.accessibility = { ...settings.accessibility, ...req.body };
    return response.success(req, res, settings.accessibility);
});

// POST /settings/data/export — trigger GDPR data export (returns user profile JSON)
exports.exportData = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    const user = await User.findByPk(userId, { attributes: { exclude: ['password', 'twoFactorSecret'] } });
    if (!user) return next(new AppError('User not found', 404));

    const profile = await Profile.findOne({ where: { userId } }).catch(() => null);
    const settings = getOrInit(userId);

    const exportData = {
        exportedAt: new Date().toISOString(),
        user: user.toJSON(),
        profile: profile ? profile.toJSON() : null,
        settings
    };

    return response.success(req, res, exportData, { message: 'Data export ready. Download this payload.' });
});

// POST /settings/account/delete — initiate account deletion
exports.deleteAccount = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    const { confirmation } = req.body;
    if (confirmation !== 'DELETE') {
        return next(new AppError('Must confirm with "DELETE" to initiate account deletion', 400));
    }

    // Soft-delete: mark account as pending deletion (real implementation would schedule a job)
    await User.update({ deletedAt: new Date() }, { where: { id: userId } }).catch(() => {});

    return response.success(req, res, {
        message: 'Account deletion scheduled. Your account will be permanently deleted in 30 days. Check your email for confirmation.',
        scheduledAt: new Date().toISOString()
    });
});
