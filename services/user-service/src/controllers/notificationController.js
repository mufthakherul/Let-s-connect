const { Notification, NotificationPreference } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.getNotifications = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const notifications = await Notification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 50
    });
    response.success(res, notifications);
});

exports.markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');

    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return next(new AppError('Notification not found', 404));

    await notification.update({ isRead: true });
    response.success(res, null, 'Notification marked as read');
});

exports.getPreferences = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const prefs = await NotificationPreference.findOne({ where: { userId } });
    response.success(res, prefs);
});
