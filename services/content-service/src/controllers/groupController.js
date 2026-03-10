const { Group, GroupMember, GroupEvent, GroupEventAttendee, GroupFile, sequelize, Op } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.createGroup = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const { name, description, privacy, category } = req.body;

    const group = await sequelize.transaction(async (t) => {
        const createdGroup = await Group.create({
            name, description, privacy, category, createdBy: userId, memberCount: 1
        }, { transaction: t });

        await GroupMember.create({
            userId, groupId: createdGroup.id, role: 'admin', status: 'active'
        }, { transaction: t });

        return createdGroup;
    });

    response.success(req, res, group, { message: 'Group created successfully' }, 201);
});

exports.getGroups = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const search = String(req.query.search || req.query.query || '').trim();
    const category = String(req.query.category || '').trim();

    const where = {};
    if (category) {
        where.category = { [Op.iLike]: `%${category}%` };
    }
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
            { category: { [Op.iLike]: `%${search}%` } },
        ];
    }

    const groups = await Group.findAll({
        where,
        order: [['memberCount', 'DESC'], ['createdAt', 'DESC']]
    });

    // Privacy filtering logic here
    response.success(req, res, groups);
});

exports.joinGroup = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const groupId = req.params.id;

    const group = await Group.findByPk(groupId);
    if (!group) return next(new AppError('Group not found', 404));

    const status = group.privacy === 'public' ? 'active' : 'pending';
    const membership = await GroupMember.create({ userId, groupId, role: 'member', status });

    if (status === 'active') await group.increment('memberCount');
    response.success(req, res, membership, { message: 'Join request processed' }, 201);
});

exports.createEvent = catchAsync(async (req, res, next) => {
    const { groupId } = req.params;
    const { title, description, startDate, endDate } = req.body;
    const userId = req.header('x-user-id');

    const event = await GroupEvent.create({
        groupId, title, description, startDate, endDate, createdBy: userId
    });

    response.success(req, res, event, { message: 'Event created' }, 201);
});
