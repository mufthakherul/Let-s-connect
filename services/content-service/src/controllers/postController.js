const { Post, Hashtag, PostHashtag, Reaction, AnonIdentity, Op, sequelize } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');
const crypto = require('crypto');

const ANONYMOUS_USER_LABEL = 'Anonymous post';

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

    let anonIdentityId = null;
    if (anonymous) {
        // Logic for finding/creating anon identity shifted to a service or helper if needed
        // Simplified for now
        anonIdentityId = null; // Placeholder
    }

    const post = await Post.create({
        userId, content, type, mediaUrls, visibility, communityId, groupId,
        isAnonymous: Boolean(anonymous),
        anonIdentityId
    });

    // Hashtag processing
    const tags = [...new Set(extractHashtags(content))];
    for (const tag of tags) {
        let [hashtag] = await Hashtag.findOrCreate({ where: { tag } });
        await PostHashtag.create({ postId: post.id, hashtagId: hashtag.id });
        await hashtag.increment('postCount');
    }

    const sanitized = await sanitizePost(post);
    response.success(res, sanitized, 'Post created successfully', 201);
});

exports.getFeed = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, filter = 'for_you' } = req.query;
    const offset = (page - 1) * limit;

    let where = { isPublished: true };
    let order = [['createdAt', 'DESC']];

    // Simplified logic for demo
    const posts = await Post.findAll({
        where, order, limit: parseInt(limit), offset: parseInt(offset)
    });

    const sanitizedPosts = await Promise.all(posts.map(p => sanitizePost(p)));
    response.success(res, sanitizedPosts);
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
            return response.success(res, null, 'Reaction removed');
        } else {
            await reaction.update({ type });
        }
    } else {
        await post.increment('likes');
    }

    response.success(res, reaction, 'Reaction updated');
});
