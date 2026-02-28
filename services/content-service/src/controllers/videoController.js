const { Channel, Video, Playlist, Subscription } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.createChannel = catchAsync(async (req, res, next) => {
    const { name, description, avatarUrl, bannerUrl } = req.body;
    const userId = req.header('x-user-id');

    const channel = await Channel.create({ userId, name, description, avatarUrl, bannerUrl });
    response.success(res, channel, 'Channel created', 201);
});

exports.uploadVideo = catchAsync(async (req, res, next) => {
    const { title, description, videoUrl, thumbnailUrl, channelId } = req.body;
    const userId = req.header('x-user-id');

    const video = await Video.create({ userId, channelId, title, description, videoUrl, thumbnailUrl });
    response.success(res, video, 'Video uploaded', 201);
});

exports.subscribe = catchAsync(async (req, res, next) => {
    const { id: channelId } = req.params;
    const userId = req.header('x-user-id');

    await Subscription.findOrCreate({ where: { userId, channelId } });
    await Channel.increment('subscribers', { where: { id: channelId } });

    response.success(res, null, 'Subscribed successfully');
});

exports.getPublicVideos = catchAsync(async (req, res) => {
    const videos = await Video.findAll({
        order: [['createdAt', 'DESC']],
        limit: 20
    });
    response.success(res, videos, 'Public videos fetched');
});

exports.getChannels = catchAsync(async (req, res) => {
    const channels = await Channel.findAll({
        order: [['subscribers', 'DESC']],
        limit: 20
    });
    response.success(res, channels, 'Channels fetched');
});

exports.getChannelById = catchAsync(async (req, res, next) => {
    const channel = await Channel.findByPk(req.params.id, {
        include: [{ model: Video }]
    });
    if (!channel) return next(new AppError('Channel not found', 404));
    response.success(res, channel, 'Channel details fetched');
});

exports.unsubscribe = catchAsync(async (req, res) => {
    const { id: channelId } = req.params;
    const userId = req.header('x-user-id');
    const result = await Subscription.destroy({ where: { userId, channelId } });
    if (result) {
        await Channel.decrement('subscribers', { where: { id: channelId } });
    }
    response.success(res, null, 'Unsubscribed successfully');
});
