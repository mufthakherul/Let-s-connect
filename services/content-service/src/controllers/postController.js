const { Post, Hashtag, PostHashtag, Reaction, AnonIdentity, Op, sequelize } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');
const crypto = require('crypto');
const axios = require('axios');

const ANONYMOUS_USER_LABEL = 'Anonymous post';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8007';
const logger = require('../../../shared/logger');

// Helpers
const extractHashtags = (content) => {
    const hashtagRegex = /#[\w]+/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase().substring(1)) : [];
};

const sanitizePost = async (post) => {
    const p = post.toJSON ? post.toJSON() : post;
    if (!p.isAnonymous) return p;

    const anon = p.anonIdentityId ? await AnonIdentity.findByPk(p.anonIdentityId) : null;
    return {
        ...p,
        userId: null,
        author: { firstName: ANONYMOUS_USER_LABEL, lastName: '' },
        anonHandle: anon ? anon.handle : ANONYMOUS_USER_LABEL,
        anonAvatar: anon ? anon.avatarUrl : null
    };
};

// Controllers
exports.createPost = catchAsync(async (req, res, next) => {
    const userId = req.header('x-user-id');
    const { content, type, mediaUrls, visibility, communityId, groupId, anonymous } = req.body;

    if (!content || String(content).trim().length === 0) {
        return next(new AppError('Post content is required', 400, 'MISSING_CONTENT'));
    }

    // AI toxicity check (non-blocking: if AI service is unavailable, allow post)
    let toxicityScore = null;
    let isFlagged = false;
    try {
        const toxicityResp = await axios.post(`${AI_SERVICE_URL}/toxicity`, { text: content }, {
            headers: { 'x-internal-gateway-token': process.env.INTERNAL_GATEWAY_TOKEN || '' },
            timeout: 2000
        });
        toxicityScore = toxicityResp.data?.score ?? null;
        // Flag if toxicity score exceeds threshold (0.85)
        isFlagged = toxicityScore !== null && toxicityScore >= 0.85;
    } catch (_err) {
        // AI service unavailable — allow post creation
    }

    if (isFlagged) {
        return next(new AppError('Your post was flagged by automated content moderation. Please review your message and community guidelines before reposting.', 422, 'CONTENT_FLAGGED'));
    }

    let anonIdentityId = null;
    if (anonymous) {
        anonIdentityId = null; // Placeholder
    }

    const post = await Post.create({
        userId, content, type, mediaUrls, visibility, communityId, groupId,
        isAnonymous: Boolean(anonymous),
        anonIdentityId,
        ...(toxicityScore !== null ? { toxicityScore } : {})
    });

    // Hashtag processing
    const tags = [...new Set(extractHashtags(content))];
    for (const tag of tags) {
        let [hashtag] = await Hashtag.findOrCreate({ where: { tag } });
        await PostHashtag.create({ postId: post.id, hashtagId: hashtag.id });
        await hashtag.increment('postCount');
    }

    const sanitized = await sanitizePost(post);
    response.success(req, res, sanitized, { message: 'Post created successfully' }, 201);
});

exports.getFeed = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, filter = 'for_you', cursor } = req.query;
    const userId = req.header('x-user-id');
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, parseInt(limit) || 20);
    const offset = (pageNum - 1) * limitNum;

    let where = { isPublished: true, isFlagged: false };
    let order = [];

    if (filter === 'trending') {
        // Trending: recent posts with high engagement velocity
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        where.createdAt = { [Op.gte]: oneDayAgo };
        order = [
            [sequelize.literal('(COALESCE(likes, 0) * 2 + COALESCE(comments, 0) * 3 + COALESCE(shares, 0) * 5)'), 'DESC'],
            ['createdAt', 'DESC']
        ];
    } else if (filter === 'recent') {
        order = [['createdAt', 'DESC']];
    } else {
        // 'for_you': time-decay + engagement scoring (Hacker News-style)
        // Score = engagement / (hours_old + 2)^1.5
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        where.createdAt = { [Op.gte]: sevenDaysAgo };
        order = [
            [sequelize.literal(
                '(COALESCE(likes, 0) * 2 + COALESCE(comments, 0) * 3 + COALESCE(shares, 0) * 5 + 1) / ' +
                'POWER(EXTRACT(EPOCH FROM (NOW() - "Post"."createdAt")) / 3600 + 2, 1.5)'
            ), 'DESC'],
            ['createdAt', 'DESC']
        ];
    }

    // Cursor-based pagination for infinite scroll
    if (cursor) {
        try {
            const cursorDate = new Date(cursor);
            if (!isNaN(cursorDate.getTime())) {
                where.createdAt = { ...(where.createdAt || {}), [Op.lt]: cursorDate };
            }
        } catch (_e) { /* invalid cursor - ignore */ }
    }

    const posts = await Post.findAll({
        where,
        order,
        limit: limitNum + 1,
        offset: cursor ? 0 : offset
    });

    const hasMore = posts.length > limitNum;
    const items = posts.slice(0, limitNum);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

    const sanitizedPosts = await Promise.all(items.map(p => sanitizePost(p)));
    response.success(req, res, { posts: sanitizedPosts, nextCursor, hasMore, count: sanitizedPosts.length });
});

exports.reactToPost = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const { type } = req.body;
    const userId = req.header('x-user-id');

    const post = await Post.findByPk(postId);
    if (!post) return next(new AppError('Post not found', 404));

    const [reaction, created] = await Reaction.findOrCreate({
        where: { postId, userId },
        defaults: { type }
    });

    if (!created) {
        if (reaction.type === type) {
            await reaction.destroy();
            await post.decrement('likes');
            return response.success(req, res, null, { message: 'Reaction removed' });
        } else {
            await reaction.update({ type });
        }
    } else {
        await post.increment('likes');
    }

    response.success(req, res, reaction, { message: 'Reaction updated' });
});

exports.getPost = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const post = await Post.findByPk(postId);
    if (!post) return next(new AppError('Post not found', 404));
    const sanitized = await sanitizePost(post);
    response.success(req, res, sanitized);
});

exports.updatePost = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.header('x-user-id');
    const { content, visibility } = req.body;

    const post = await Post.findByPk(postId);
    if (!post) return next(new AppError('Post not found', 404));
    if (post.userId !== userId) return next(new AppError('Not authorized', 403));

    if (content !== undefined) {
        // Re-run toxicity check on update
        let toxicityScore = null;
        let isFlagged = false;
        try {
            const toxicityResp = await axios.post(`${AI_SERVICE_URL}/toxicity`, { text: content }, {
                headers: { 'x-internal-gateway-token': process.env.INTERNAL_GATEWAY_TOKEN || '' },
                timeout: 2000
            });
            toxicityScore = toxicityResp.data?.score ?? null;
            isFlagged = toxicityScore !== null && toxicityScore >= 0.85;
        } catch (_err) { logger.warn('[Post:updatePost] Toxicity check unavailable:', _err.message); }

        if (isFlagged) {
            return next(new AppError('Updated content was flagged by automated moderation. Please revise before reposting.', 422, 'CONTENT_FLAGGED'));
        }
        await post.update({ content, ...(toxicityScore !== null ? { toxicityScore } : {}), ...(visibility ? { visibility } : {}) });
    } else if (visibility) {
        await post.update({ visibility });
    }

    response.success(req, res, await sanitizePost(post), { message: 'Post updated' });
});

exports.deletePost = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.header('x-user-id');

    const post = await Post.findByPk(postId);
    if (!post) return next(new AppError('Post not found', 404));
    if (post.userId !== userId) return next(new AppError('Not authorized', 403));

    await post.destroy();
    response.success(req, res, null, { message: 'Post deleted' });
});

exports.sharePost = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.header('x-user-id');
    const { commentary, visibility = 'public' } = req.body;

    const original = await Post.findByPk(postId);
    if (!original) return next(new AppError('Post not found', 404));

    const shared = await Post.create({
        userId,
        content: commentary || '',
        type: 'text',
        visibility,
        repostOf: postId,
        isPublished: true
    });

    await original.increment('shares');
    response.success(req, res, shared, { message: 'Post shared' }, 201);
});

exports.reportPost = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.header('x-user-id');
    const { reason = 'inappropriate' } = req.body;

    const post = await Post.findByPk(postId);
    if (!post) return next(new AppError('Post not found', 404));

    // Flag post for moderation review
    await post.update({ isFlagged: true, flagReason: reason });
    response.success(req, res, null, { message: 'Post reported for review' });
});
