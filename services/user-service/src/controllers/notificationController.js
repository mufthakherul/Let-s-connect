const { Notification, NotificationPreference, User } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');
const logger = require('../../../shared/logger');

// Lazy-load email service
let emailService = null;
function getEmailService() {
    if (!emailService) {
        try { emailService = require('../../email-service'); } catch (e) { /* optional */ }
    }
    return emailService;
}

/**
 * Create a notification and optionally deliver it via email if user prefs allow.
 */
exports.createAndDeliverNotification = async ({ userId, type, title, body, data = {} }) => {
    try {
        const notification = await Notification.create({ userId, type, title, body, data, isRead: false });

        // Email delivery gated on NotificationPreference
        const prefs = await NotificationPreference.findOne({ where: { userId } });
        const emailEnabled = prefs ? prefs.emailNotifications !== false : true;

        if (emailEnabled) {
            const svc = getEmailService();
            if (svc) {
                const user = await User.findByPk(userId, { attributes: ['email', 'firstName'] });
                if (user && user.email) {
                    await svc.sendEmail(user.email, 'notification', {
                        user: { firstName: user.firstName || 'User' },
                        data: { title, body, type }
                    }).catch((err) => logger.warn('[Notification] email delivery failed:', err));
                }
            }
        }

        return notification;
    } catch (err) {
        logger.error('[Notification] createAndDeliverNotification error:', err);
        throw err;
    }
};

exports.getNotifications = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    const where = { userId };
    if (unreadOnly) where.isRead = false;

    const { rows: notifications, count } = await Notification.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });

    response.success(req, res, {
        notifications,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
        unreadCount: unreadOnly ? count : await Notification.count({ where: { userId, isRead: false } })
    });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');

    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return next(new AppError('Notification not found', 404));

    await notification.update({ isRead: true });
    response.success(req, res, null, { message: 'Notification marked as read' });
});

exports.markAllRead = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
    response.success(req, res, null, { message: 'All notifications marked as read' });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');

    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return next(new AppError('Notification not found', 404));

    await notification.destroy();
    response.success(req, res, null, { message: 'Notification deleted' });
});

exports.getPreferences = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    let prefs = await NotificationPreference.findOne({ where: { userId } });
    if (!prefs) {
        prefs = await NotificationPreference.create({ userId });
    }
    response.success(req, res, prefs);
});

exports.updatePreferences = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const { emailNotifications, pushNotifications, inAppNotifications, digestFrequency } = req.body;

    const [prefs] = await NotificationPreference.findOrCreate({ where: { userId } });
    await prefs.update({
        ...(emailNotifications !== undefined ? { emailNotifications } : {}),
        ...(pushNotifications !== undefined ? { pushNotifications } : {}),
        ...(inAppNotifications !== undefined ? { inAppNotifications } : {}),
        ...(digestFrequency !== undefined ? { digestFrequency } : {})
    });
    response.success(req, res, prefs);
});
