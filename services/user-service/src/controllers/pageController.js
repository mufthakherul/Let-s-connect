const { Page, PageAdmin, PageFollower, PageView } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.createPage = catchAsync(async (req, res, next) => {
    const { name, description, category } = req.body;
    const userId = req.header('x-user-id');

    const page = await Page.create({ name, description, category, userId });
    await PageAdmin.create({ pageId: page.id, userId, role: 'owner' });

    response.success(req, res, page, { message: 'Page created successfully' }, 201);
});

exports.getPage = catchAsync(async (req, res, next) => {
    const page = await Page.findByPk(req.params.id);
    if (!page) return next(new AppError('Page not found', 404));

    // Log a view (simplified)
    await PageView.create({ pageId: page.id, userId: req.header('x-user-id') || null });

    response.success(req, res, page);
});

exports.followPage = catchAsync(async (req, res, next) => {
    const pageId = req.params.id;
    const userId = req.header('x-user-id');

    const existing = await PageFollower.findOne({ where: { pageId, userId } });
    if (existing) return next(new AppError('Already following this page', 400));

    await PageFollower.create({ pageId, userId });
    await Page.increment('followers', { where: { id: pageId } });

    response.success(req, res, null, { message: 'Page followed successfully' });
});

const { Op } = require('sequelize');
const { PageInsight } = require('../models');

exports.listPages = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const { category, filter, search, limit: limitStr, page: pageStr } = req.query;
    const limit = Math.min(50, parseInt(limitStr) || 20);
    const offset = (Math.max(1, parseInt(pageStr) || 1) - 1) * limit;

    const where = {};
    if (category) where.category = category;
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
        ];
    }
    if (filter === 'mine' && userId) where.userId = userId;

    const { rows, count } = await Page.findAndCountAll({ where, limit, offset, order: [['followers', 'DESC'], ['createdAt', 'DESC']] });
    response.success(req, res, { pages: rows, total: count, limit, offset });
});

exports.updatePage = catchAsync(async (req, res, next) => {
    const page = await Page.findByPk(req.params.id);
    if (!page) return next(new AppError('Page not found', 404));

    const userId = req.header('x-user-id');
    const isAdmin = await PageAdmin.findOne({ where: { pageId: page.id, userId } });
    if (!isAdmin) return next(new AppError('Not authorized', 403));

    const { name, description, category, avatarUrl, coverUrl, ctaLabel, ctaUrl } = req.body;
    await page.update({ name, description, category, avatarUrl, coverUrl, ctaLabel, ctaUrl });
    response.success(req, res, page);
});

exports.unfollowPage = catchAsync(async (req, res, next) => {
    const pageId = req.params.id;
    const userId = req.header('x-user-id');

    const follower = await PageFollower.findOne({ where: { pageId, userId } });
    if (!follower) return next(new AppError('Not following this page', 400));

    await follower.destroy();
    await Page.decrement('followers', { where: { id: pageId } });

    response.success(req, res, null, 'Unfollowed page');
});

exports.getPageFeed = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { cursor, limit: limitStr } = req.query;
    const limit = Math.min(20, parseInt(limitStr) || 10);

    const page = await Page.findByPk(id);
    if (!page) return next(new AppError('Page not found', 404));

    // Return page insights and recent posts (simplified — posts stored in content-service)
    response.success(req, res, { pageId: id, posts: [], nextCursor: null, hasMore: false });
});

exports.getPageInsights = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');

    const page = await Page.findByPk(id);
    if (!page) return next(new AppError('Page not found', 404));

    const isAdmin = await PageAdmin.findOne({ where: { pageId: id, userId } });
    if (!isAdmin) return next(new AppError('Not authorized', 403));

    const viewCount = await PageView.count({ where: { pageId: id } });
    const followerCount = await PageFollower.count({ where: { pageId: id } });

    // 7-day daily views
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentViews = await PageView.count({ where: { pageId: id, createdAt: { [Op.gte]: sevenDaysAgo } } });

    response.success(req, res, {
        totalViews: viewCount,
        followers: followerCount,
        recentViews,
        engagementRate: followerCount > 0 ? ((recentViews / followerCount) * 100).toFixed(1) : 0
    });
});

exports.schedulePost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.header('x-user-id');
    const { content, scheduledAt } = req.body;

    if (!content || !scheduledAt) return next(new AppError('content and scheduledAt are required', 400));

    const page = await Page.findByPk(id);
    if (!page) return next(new AppError('Page not found', 404));

    const isAdmin = await PageAdmin.findOne({ where: { pageId: id, userId } });
    if (!isAdmin) return next(new AppError('Not authorized', 403));

    // Store as a page insight entry (draft) — in production this would be a separate ScheduledPost table
    const insight = await PageInsight.create({
        pageId: id,
        date: new Date(scheduledAt),
        reach: 0,
        impressions: 0,
        engagements: 0,
        followers: 0,
        metadata: JSON.stringify({ type: 'scheduled_post', content, scheduledAt, createdBy: userId })
    });

    response.success(req, res, { id: insight.id, scheduledAt, content }, { message: 'Post scheduled' }, 201);
});

exports.createPagePost = catchAsync(async (req, res, next) => {
    const { id: pageId } = req.params;
    const userId = req.header('x-user-id');
    if (!userId) return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));

    const page = await Page.findByPk(pageId);
    if (!page) return next(new AppError('Page not found', 404));

    const isAdmin = await PageAdmin.findOne({ where: { pageId, userId } });
    if (!isAdmin) return next(new AppError('Not authorized to post on this page', 403));

    const { content, mediaUrl, visibility = 'public' } = req.body;
    if (!content) return next(new AppError('content is required', 400));

    // Record page insight for engagement
    await PageInsight.create({
        pageId,
        date: new Date(),
        reach: 1,
        impressions: 1,
        engagements: 0,
        followers: await PageFollower.count({ where: { pageId } }),
        metadata: JSON.stringify({ type: 'page_post', content: content.substring(0, 200), createdBy: userId })
    }).catch(() => {});

    return response.success(req, res, { pageId, content, mediaUrl, visibility, createdBy: userId }, {}, 201);
});
