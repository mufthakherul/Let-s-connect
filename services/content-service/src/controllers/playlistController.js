const { Playlist, PlaylistItem, Video } = require('../models');
const { catchAsync, AppError } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.getUserPlaylists = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const playlists = await Playlist.findAll({ where: { userId } });
    response.success(res, playlists, 'Playlists fetched');
});

exports.createPlaylist = catchAsync(async (req, res) => {
    const { name, description, visibility } = req.body;
    const userId = req.header('x-user-id');
    const playlist = await Playlist.create({ userId, name, description, visibility });
    response.success(res, playlist, 'Playlist created', 201);
});

exports.getPlaylistById = catchAsync(async (req, res, next) => {
    const playlist = await Playlist.findByPk(req.params.id, {
        include: [{ model: PlaylistItem, include: [Video] }]
    });
    if (!playlist) return next(new AppError('Playlist not found', 404));
    response.success(res, playlist, 'Playlist details fetched');
});

exports.addVideoToPlaylist = catchAsync(async (req, res) => {
    const { id: playlistId } = req.params;
    const { videoId } = req.body;
    const item = await PlaylistItem.create({ playlistId, videoId });
    await Playlist.increment('videoCount', { where: { id: playlistId } });
    response.success(res, item, 'Video added to playlist', 201);
});

exports.removeVideoFromPlaylist = catchAsync(async (req, res) => {
    const { id: playlistId, videoId } = req.params;
    const result = await PlaylistItem.destroy({ where: { playlistId, videoId } });
    if (result) {
        await Playlist.decrement('videoCount', { where: { id: playlistId } });
    }
    response.success(res, null, 'Video removed from playlist');
});
