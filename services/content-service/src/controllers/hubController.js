const { ForumPost, ForumReply, Award, PostAward, Post } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.createForumPost = catchAsync(async (req, res, next) => {
    const { title, content, category } = req.body;
    const userId = req.header('x-user-id');

    const post = await ForumPost.create({ userId, title, content, category });
    response.success(res, post, 'Forum post created', 201);
});

exports.giveAward = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const { awardId, message } = req.body;
    const userId = req.header('x-user-id');

    const post = await Post.findByPk(postId);
    if (!post) return next(new AppError('Post not found', 404));

    const postAward = await PostAward.create({ postId, awardId, givenBy: userId, message });
    response.success(res, postAward, 'Award given');
});
