const { Page, PageAdmin, PageFollower, PageView } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.createPage = catchAsync(async (req, res, next) => {
    const { name, description, category } = req.body;
    const userId = req.header('x-user-id');

    const page = await Page.create({ name, description, category, userId });
    await PageAdmin.create({ pageId: page.id, userId, role: 'owner' });

    response.success(res, page, 'Page created successfully', 201);
});

exports.getPage = catchAsync(async (req, res, next) => {
    const page = await Page.findByPk(req.params.id);
    if (!page) return next(new AppError('Page not found', 404));

    // Log a view (simplified)
    await PageView.create({ pageId: page.id, userId: req.header('x-user-id') || null });

    response.success(res, page);
});

exports.followPage = catchAsync(async (req, res, next) => {
    const pageId = req.params.id;
    const userId = req.header('x-user-id');

    const existing = await PageFollower.findOne({ where: { pageId, userId } });
    if (existing) return next(new AppError('Already following this page', 400));

    await PageFollower.create({ pageId, userId });
    await Page.increment('followers', { where: { id: pageId } });

    response.success(res, null, 'Page followed successfully');
});
