const { Community, CommunityMember } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.createCommunity = catchAsync(async (req, res, next) => {
    const { name, description, rules, visibility } = req.body;
    const userId = req.header('x-user-id');

    const community = await Community.create({
        name: name.toLowerCase(),
        description,
        rules,
        createdBy: userId,
        visibility
    });

    await CommunityMember.create({ userId, communityId: community.id, role: 'admin' });
    await community.increment('members');

    response.success(res, community, 'Community created', 201);
});

exports.getCommunities = catchAsync(async (req, res, next) => {
    const communities = await Community.findAll({
        where: { visibility: 'public' },
        order: [['members', 'DESC']]
    });
    response.success(res, communities);
});
