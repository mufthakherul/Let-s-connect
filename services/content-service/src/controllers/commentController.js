const { Comment, Post, AnonIdentity } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.addComment = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const { content, parentId, anonymous } = req.body;
    const userId = req.header('x-user-id');

    const post = await Post.findByPk(postId);
    if (!post) return next(new AppError('Post not found', 404));

    const comment = await Comment.create({
        postId, userId, content, parentId,
        isAnonymous: Boolean(anonymous)
    });

    await post.increment('comments');
    response.success(res, comment, 'Comment added', 201);
});

exports.getComments = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const comments = await Comment.findAll({
        where: { postId },
        order: [['createdAt', 'DESC']]
    });
    response.success(res, comments);
});
