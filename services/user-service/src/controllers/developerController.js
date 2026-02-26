const jwt = require('jsonwebtoken');
const { User, Page, PageInsight } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Developer Sandbox
exports.generateSandboxToken = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return next(new AppError('User not found', 404));

    const scopes = req.body.scopes || ['read:sandbox', 'write:sandbox'];
    const token = jwt.sign({ id: user.id, scopes, developerMode: true }, JWT_SECRET, { expiresIn: '365d' });

    response.success(res, { token, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }, 'Sandbox token generated');
});

// Business & Creator Analytics
exports.getCreatorAnalytics = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const pages = await Page.findAll({ where: { userId } });
    const pageIds = pages.map(p => p.id);

    let profileViews = 0, newFollowers = 0;
    if (pageIds.length > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const insights = await PageInsight.findAll({ where: { pageId: pageIds, date: { [Op.gte]: startDate } } });
        insights.forEach(i => {
            profileViews += i.totalViews;
            newFollowers += i.newFollowers;
        });
    }

    response.success(res, { profileViews, newFollowers, currentFollowers: pages.reduce((s, p) => s + p.followers, 0) });
});

exports.getBusinessCampaigns = catchAsync(async (req, res, next) => {
    // Mock campaigns
    const campaigns = [
        { id: 'camp_1', name: 'Q3 Retargeting', status: 'Active', spend: 1250, impressions: 45200 }
    ];
    response.success(res, { campaigns, totalSpend: 1250 });
});
