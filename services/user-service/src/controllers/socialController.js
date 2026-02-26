const { User, Skill, Endorsement, Friend, FriendRequest } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

// Skills & Endorsements
exports.addSkill = catchAsync(async (req, res, next) => {
    const { name, level } = req.body;
    const { userId } = req.params;

    const existing = await Skill.findOne({ where: { userId, name } });
    if (existing) {
        return next(new AppError('Skill already exists', 400, 'CONFLICT'));
    }

    const skill = await Skill.create({ userId, name, level });
    response.success(res, skill, 'Skill added successfully', 201);
});

exports.getSkills = catchAsync(async (req, res, next) => {
    const skills = await Skill.findAll({
        where: { userId: req.params.userId },
        order: [['endorsements', 'DESC']]
    });
    response.success(res, skills);
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

    response.success(res, skill, 'Skill endorsed successfully');
});

// Friends & Social
exports.sendFriendRequest = catchAsync(async (req, res, next) => {
    const { receiverId } = req.body;
    const senderId = req.header('x-user-id');

    if (senderId === receiverId) return next(new AppError('Cannot send request to yourself', 400));

    const existing = await FriendRequest.findOne({
        where: { senderId, receiverId, status: 'pending' }
    });
    if (existing) return next(new AppError('Request already pending', 400));

    const request = await FriendRequest.create({ senderId, receiverId });
    response.success(res, request, 'Friend request sent', 201);
});

exports.acceptFriendRequest = catchAsync(async (req, res, next) => {
    const { requestId } = req.params;
    const userId = req.header('x-user-id');

    const request = await FriendRequest.findOne({ where: { id: requestId, receiverId: userId, status: 'pending' } });
    if (!request) return next(new AppError('Friend request not found', 404));

    await request.update({ status: 'accepted' });

    // Create friendship records (both ways)
    await Friend.bulkCreate([
        { userId: request.senderId, friendId: request.receiverId },
        { userId: request.receiverId, friendId: request.senderId }
    ]);

    response.success(res, null, 'Friend request accepted');
});
