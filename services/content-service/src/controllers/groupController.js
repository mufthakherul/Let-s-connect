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

// ─── Phase 2: Full Group CRUD & Member Management ────────────────────────────

exports.getGroup = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');

    const group = await Group.findByPk(id);
    if (!group) return next(new AppError('Group not found', 404));

    let isMember = false;
    let memberRole = null;
    if (userId) {
        const membership = await GroupMember.findOne({ where: { groupId: id, userId, status: 'active' } });
        isMember = !!membership;
        memberRole = membership ? membership.role : null;
    }

    response.success(req, res, { ...group.toJSON(), isMember, memberRole });
});

exports.updateGroup = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');

    const group = await Group.findByPk(id);
    if (!group) return next(new AppError('Group not found', 404));

    const adminCheck = await GroupMember.findOne({ where: { groupId: id, userId, role: { [Op.in]: ['admin', 'moderator'] }, status: 'active' } });
    if (!adminCheck && group.createdBy !== userId) return next(new AppError('Not authorized', 403));

    const { name, description, category, privacy, coverUrl, rules } = req.body;
    await group.update({ name, description, category, privacy, coverUrl, rules });
    response.success(req, res, group);
});

exports.leaveGroup = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');

    const membership = await GroupMember.findOne({ where: { groupId: id, userId } });
    if (!membership) return next(new AppError('Not a member', 404));

    await membership.destroy();
    const group = await Group.findByPk(id);
    if (group && group.memberCount > 0) await group.decrement('memberCount');

    response.success(req, res, null, 'Left group successfully');
});

exports.getMembers = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const { rows, count } = await GroupMember.findAndCountAll({
        where: { groupId: id, status: 'active' },
        limit,
        offset,
        order: [['role', 'ASC'], ['createdAt', 'ASC']]
    });

    response.success(req, res, {
        members: rows,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
    });
});

exports.promoteMember = catchAsync(async (req, res, next) => {
    const { id, userId: targetId } = req.params;
    const requesterId = req.header('x-user-id');

    const group = await Group.findByPk(id);
    if (!group) return next(new AppError('Group not found', 404));
    if (group.createdBy !== requesterId) return next(new AppError('Only group owner can promote members', 403));

    const membership = await GroupMember.findOne({ where: { groupId: id, userId: targetId } });
    if (!membership) return next(new AppError('Member not found', 404));

    await membership.update({ role: req.body.role || 'moderator' });
    response.success(req, res, membership, 'Member promoted');
});

exports.removeMember = catchAsync(async (req, res, next) => {
    const { id, userId: targetId } = req.params;
    const requesterId = req.header('x-user-id');

    const group = await Group.findByPk(id);
    if (!group) return next(new AppError('Group not found', 404));

    const adminCheck = await GroupMember.findOne({ where: { groupId: id, userId: requesterId, role: { [Op.in]: ['admin', 'moderator'] } } });
    if (!adminCheck && group.createdBy !== requesterId) return next(new AppError('Not authorized', 403));

    await GroupMember.destroy({ where: { groupId: id, userId: targetId } });
    if (group.memberCount > 0) await group.decrement('memberCount');

    response.success(req, res, null, 'Member removed');
});

exports.getGroupFeed = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { cursor, limit: limitStr } = req.query;
    const limit = Math.min(20, parseInt(limitStr) || 10);

    const Post = require('../models').Post;
    const where = { groupId: id };
    if (cursor) where.createdAt = { [Op.lt]: new Date(cursor) };

    const posts = await Post.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: limit + 1
    });

    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    response.success(req, res, { posts: items, nextCursor, hasMore });
});
