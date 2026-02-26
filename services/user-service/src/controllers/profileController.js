const { User, Profile } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.getProfile = catchAsync(async (req, res, next) => {
    const profile = await Profile.findOne({
        where: { userId: req.params.userId },
        include: [{ model: User, attributes: ['username', 'email', 'firstName', 'lastName', 'avatar'] }]
    });

    if (!profile) {
        return next(new AppError('Profile not found', 404, 'NOT_FOUND'));
    }

    response.success(res, profile);
});

exports.updateProfile = catchAsync(async (req, res, next) => {
    const profile = await Profile.findOne({ where: { userId: req.user.id } });

    if (!profile) {
        return next(new AppError('Profile not found', 404, 'NOT_FOUND'));
    }

    await profile.update(req.body);

    response.success(res, profile, 'Profile updated successfully');
});
