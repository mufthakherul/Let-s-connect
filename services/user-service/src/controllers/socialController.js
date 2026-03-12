const { User, Profile, Skill, Endorsement, Friend, FriendRequest } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');
const { Op } = require('sequelize');
const { sanitizeText } = require('../../../shared/sanitization');
const { createAndDeliverNotification } = require('./notificationController');

// ─── Skills & Endorsements ────────────────────────────────────────────────────

exports.addSkill = catchAsync(async (req, res, next) => {
    const { name, level } = req.body;
    const { userId } = req.params;

    const existing = await Skill.findOne({ where: { userId, name } });
    if (existing) {
        return next(new AppError('Skill already exists', 400, 'CONFLICT'));
    }

    const skill = await Skill.create({ userId, name, level });
    response.success(req, res, skill, { message: 'Skill added successfully' }, 201);
});

exports.getSkills = catchAsync(async (req, res) => {
    const skills = await Skill.findAll({
        where: { userId: req.params.userId },
        order: [['endorsements', 'DESC']]
    });
    response.success(req, res, skills);
});

exports.endorseSkill = catchAsync(async (req, res, next) => {
    const { skillId } = req.params;
    const endorserId = req.header('x-user-id');

    const skill = await Skill.findByPk(skillId);
    if (!skill) return next(new AppError('Skill not found', 404));

    const existing = await Endorsement.findOne({ where: { skillId, endorserId } });
    if (existing) return next(new AppError('Already endorsed this skill', 400));

    await Endorsement.create({ skillId, endorserId });
    await skill.increment('endorsements');

    response.success(req, res, skill, { message: 'Skill endorsed successfully' });
});

// ─── Friends ──────────────────────────────────────────────────────────────────

exports.sendFriendRequest = catchAsync(async (req, res, next) => {
    const { receiverId } = req.body;
    const senderId = req.header('x-user-id');

    if (!senderId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    if (senderId === receiverId) return next(new AppError('Cannot send request to yourself', 400));

    // Check if already friends
    const alreadyFriends = await Friend.findOne({ where: { userId: senderId, friendId: receiverId } });
    if (alreadyFriends) return next(new AppError('Already friends', 400, 'ALREADY_FRIENDS'));

    const existing = await FriendRequest.findOne({
        where: { senderId, receiverId, status: 'pending' }
    });
    if (existing) return next(new AppError('Request already pending', 400));

    // Allow re-send if previously declined
    const declined = await FriendRequest.findOne({ where: { senderId, receiverId, status: 'declined' } });
    if (declined) {
        await declined.update({ status: 'pending' });
        return response.success(req, res, declined, { message: 'Friend request sent' }, 200);
    }

    const request = await FriendRequest.create({ senderId, receiverId });

    // Deliver notification to receiver
    createAndDeliverNotification({
        userId: receiverId,
        type: 'friend_request',
        title: 'New Friend Request',
        body: 'Someone sent you a friend request',
        data: { requestId: request.id, senderId }
    }).catch(() => {});

    return response.success(req, res, request, { message: 'Friend request sent' }, 201);
});

exports.acceptFriendRequest = catchAsync(async (req, res, next) => {
    const { requestId } = req.params;
    const userId = req.header('x-user-id');

    const request = await FriendRequest.findOne({ where: { id: requestId, receiverId: userId, status: 'pending' } });
    if (!request) return next(new AppError('Friend request not found', 404));

    await request.update({ status: 'accepted' });

    await Friend.bulkCreate([
        { userId: request.senderId, friendId: request.receiverId, type: 'friend' },
        { userId: request.receiverId, friendId: request.senderId, type: 'friend' }
    ], { ignoreDuplicates: true });

    return response.success(req, res, null, { message: 'Friend request accepted' });
});

exports.declineFriendRequest = catchAsync(async (req, res, next) => {
    const { requestId } = req.params;
    const userId = req.header('x-user-id');

    const request = await FriendRequest.findOne({ where: { id: requestId, receiverId: userId, status: 'pending' } });
    if (!request) return next(new AppError('Friend request not found', 404));

    await request.update({ status: 'declined' });
    return response.success(req, res, null, { message: 'Friend request declined' });
});

exports.getFriends = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search ? sanitizeText(req.query.search, { maxLength: 100 }) : null;

    const whereClause = { userId, type: 'friend' };
    const userWhere = {};
    if (search) {
        userWhere[Op.or] = [
            { username: { [Op.iLike]: `%${search}%` } },
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { rows: friendships, count } = await Friend.findAndCountAll({
        where: whereClause,
        include: [{
            model: User,
            as: 'FriendUser',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
            where: Object.keys(userWhere).length ? userWhere : undefined,
            include: [{ model: Profile, attributes: ['bio', 'location'] }]
        }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
    });

    return response.success(req, res, {
        friends: friendships.map(f => f.FriendUser),
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
    });
});

exports.getFriendRequests = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    const type = req.query.type || 'incoming'; // incoming | outgoing

    const whereClause = type === 'incoming'
        ? { receiverId: userId, status: 'pending' }
        : { senderId: userId, status: 'pending' };

    const requests = await FriendRequest.findAll({
        where: whereClause,
        include: [
            {
                model: User,
                as: 'Sender',
                attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
            },
            {
                model: User,
                as: 'Receiver',
                attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
            }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
    });

    return response.success(req, res, requests);
});

exports.unfriend = catchAsync(async (req, res, next) => {
    const { userId: targetId } = req.params;
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    await Friend.destroy({
        where: {
            [Op.or]: [
                { userId, friendId: targetId },
                { userId: targetId, friendId: userId }
            ]
        }
    });

    // Mark any friend requests as unfriended
    await FriendRequest.update({ status: 'unfriended' }, {
        where: {
            [Op.or]: [
                { senderId: userId, receiverId: targetId },
                { senderId: targetId, receiverId: userId }
            ],
            status: 'accepted'
        }
    });

    return response.success(req, res, null, { message: 'Unfriended successfully' });
});

exports.getMutualFriends = catchAsync(async (req, res, next) => {
    const { userId: targetId } = req.params;
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    // Friends of userId
    const myFriends = await Friend.findAll({
        where: { userId },
        attributes: ['friendId']
    });
    const myFriendIds = myFriends.map(f => f.friendId);

    // Friends of targetId
    const theirFriends = await Friend.findAll({
        where: { userId: targetId },
        attributes: ['friendId']
    });
    const theirFriendIds = theirFriends.map(f => f.friendId);

    const mutualIds = myFriendIds.filter(id => theirFriendIds.includes(id));

    const mutualUsers = await User.findAll({
        where: { id: mutualIds },
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
        limit: 20
    });

    return response.success(req, res, { mutual: mutualUsers, count: mutualIds.length });
});

exports.getFriendSuggestions = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    // PYMK: find friends of friends who are not already friends
    const myFriends = await Friend.findAll({ where: { userId }, attributes: ['friendId'] });
    const myFriendIds = myFriends.map(f => f.friendId);

    // Existing requests (sent or received)
    const existingRequests = await FriendRequest.findAll({
        where: {
            [Op.or]: [{ senderId: userId }, { receiverId: userId }],
            status: { [Op.in]: ['pending', 'accepted'] }
        },
        attributes: ['senderId', 'receiverId']
    });
    const excludeIds = new Set([userId, ...myFriendIds]);
    existingRequests.forEach(r => {
        excludeIds.add(r.senderId);
        excludeIds.add(r.receiverId);
    });

    // Friends-of-friends
    let suggestions = [];
    if (myFriendIds.length > 0) {
        const fof = await Friend.findAll({
            where: {
                userId: { [Op.in]: myFriendIds },
                friendId: { [Op.notIn]: [...excludeIds] }
            },
            include: [{
                model: User,
                as: 'FriendUser',
                attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
            }],
            limit: 20
        });
        suggestions = fof.map(f => f.FriendUser).filter(Boolean);
    }

    // Fallback: random active users if not enough
    if (suggestions.length < 10) {
        const fallback = await User.findAll({
            where: { id: { [Op.notIn]: [...excludeIds] }, isActive: true },
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
            limit: 10 - suggestions.length,
            order: [['createdAt', 'DESC']]
        });
        suggestions = [...suggestions, ...fallback];
    }

    // Deduplicate
    const seen = new Set();
    suggestions = suggestions.filter(u => {
        if (!u || seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
    }).slice(0, 10);

    return response.success(req, res, suggestions);
});

exports.followUser = catchAsync(async (req, res, next) => {
    const { userId: targetId } = req.params;
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    if (userId === targetId) return next(new AppError('Cannot follow yourself', 400));

    // Use friend model as a one-way "follow" entry (friendId = target, no reciprocal)
    const existing = await Friend.findOne({ where: { userId, friendId: targetId, type: 'follow' } });
    if (existing) return next(new AppError('Already following', 400));

    await Friend.create({ userId, friendId: targetId, type: 'follow' });
    return response.success(req, res, null, { message: 'Followed successfully' });
});

exports.unfollowUser = catchAsync(async (req, res, next) => {
    const { userId: targetId } = req.params;
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    await Friend.destroy({ where: { userId, friendId: targetId, type: 'follow' } });
    return response.success(req, res, null, { message: 'Unfollowed successfully' });
});

