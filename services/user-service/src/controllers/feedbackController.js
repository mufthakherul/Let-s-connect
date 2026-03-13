const { Feedback, User, sequelize } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

const sanitizeText = (value, maxLength) => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
};

const clampRating = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.min(5, Math.round(parsed * 10) / 10));
};

const ALLOWED_CATEGORIES = new Set(['feature-request', 'bug-report', 'improvement', 'praise', 'other']);

exports.submitFeedback = catchAsync(async (req, res) => {
    const category = sanitizeText(req.body?.category, 60);
    const subject = sanitizeText(req.body?.subject, 140);
    const message = sanitizeText(req.body?.message, 1000);
    const displayName = sanitizeText(req.body?.displayName || 'Community Member', 60) || 'Community Member';
    const rating = clampRating(req.body?.rating);

    if (!ALLOWED_CATEGORIES.has(category)) {
        throw new AppError('Invalid feedback category', 400, 'INVALID_CATEGORY');
    }

    if (!subject || subject.length < 3) {
        throw new AppError('Subject must be at least 3 characters', 400, 'INVALID_SUBJECT');
    }

    if (!message || message.length < 10) {
        throw new AppError('Feedback message must be at least 10 characters', 400, 'INVALID_MESSAGE');
    }

    const feedback = await Feedback.create({
        userId: req.user?.id || null,
        category,
        subject,
        message,
        rating,
        displayName
    });

    response.success(res, { id: feedback.id, status: feedback.status }, 'Feedback submitted successfully');
});

exports.getApprovedFeedback = catchAsync(async (req, res) => {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const minRating = clampRating(req.query.minRating);

    const where = { status: 'approved' };
    if (minRating !== null) {
        where.rating = { [require('sequelize').Op.gte]: minRating };
    }

    const items = await Feedback.findAll({
        where,
        order: [['approvedAt', 'DESC']],
        limit
    });

    const stats = await Feedback.findOne({
        where,
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
            [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
            [sequelize.fn('SUM', sequelize.literal(`CASE WHEN "verified" THEN 1 ELSE 0 END`)), 'verifiedCount']
        ],
        raw: true
    });

    response.success(res, {
        testimonials: items.map((item) => ({
            id: item.id,
            displayName: item.displayName,
            role: 'Community Member',
            message: item.message,
            rating: item.rating,
            verified: item.verified,
            approvedAt: item.approvedAt
        })),
        stats: {
            total: Number(stats.total || 0),
            averageRating: stats.averageRating ? Number(Number(stats.averageRating).toFixed(2)) : null,
            verifiedCount: Number(stats.verifiedCount || 0)
        }
    });
});

const ensureAdmin = (req, res, next) => {
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) {
        return next(new AppError('Not authorized', 403, 'NOT_AUTHORIZED'));
    }
    next();
};

exports.getPendingFeedback = catchAsync(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { rows, count } = await Feedback.findAndCountAll({
        where: { status: 'pending' },
        order: [['createdAt', 'DESC']],
        limit,
        offset
    });

    response.success(res, {
        pending: rows,
        total: count,
        page,
        limit
    });
});

exports.approveFeedback = catchAsync(async (req, res) => {
    const id = req.params.id;
    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
        throw new AppError('Feedback not found', 404, 'NOT_FOUND');
    }

    feedback.status = 'approved';
    // Allow moderators to optionally mark feedback as "verified" (e.g., from a known user)
    if (typeof req.body.verified === 'boolean') {
        feedback.verified = req.body.verified;
    } else {
        feedback.verified = true;
    }
    feedback.reviewerId = req.user?.id;
    feedback.reviewedAt = new Date();
    feedback.reason = sanitizeText(req.body?.reason || 'Approved by moderator', 250);

    if (req.body.displayName) {
        feedback.displayName = sanitizeText(req.body.displayName, 60);
    }

    await feedback.save();

    response.success(res, { id: feedback.id, status: feedback.status });
});

exports.rejectFeedback = catchAsync(async (req, res) => {
    const id = req.params.id;
    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
        throw new AppError('Feedback not found', 404, 'NOT_FOUND');
    }

    feedback.status = 'rejected';
    feedback.verified = false;
    feedback.reviewerId = req.user?.id;
    feedback.reviewedAt = new Date();
    feedback.reason = sanitizeText(req.body?.reason || 'Rejected by moderator', 250);

    await feedback.save();

    response.success(res, { id: feedback.id, status: feedback.status });
});

exports.ensureAdmin = ensureAdmin;
